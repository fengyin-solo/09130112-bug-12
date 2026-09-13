from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas
from ..auth import get_current_active_user, check_project_permission

router = APIRouter(prefix="/annotations", tags=["Annotations"])


@router.get("/seismic/{seismic_id}", response_model=List[schemas.Annotation])
async def list_annotations(
    seismic_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    seismic = db.query(models.SeismicData).filter(models.SeismicData.id == seismic_id).first()
    if not seismic:
        raise HTTPException(status_code=404, detail="Seismic data not found")

    check_project_permission(current_user, seismic.project_id, "viewer", db)

    annotations = db.query(models.Annotation).filter(
        models.Annotation.seismic_data_id == seismic_id
    ).all()

    return annotations


@router.post("", response_model=schemas.Annotation)
async def create_annotation(
    annotation_in: schemas.AnnotationCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    seismic = db.query(models.SeismicData).filter(
        models.SeismicData.id == annotation_in.seismic_data_id
    ).first()
    if not seismic:
        raise HTTPException(status_code=404, detail="Seismic data not found")

    check_project_permission(current_user, seismic.project_id, "editor", db)

    annotation = models.Annotation(
        seismic_data_id=annotation_in.seismic_data_id,
        owner_id=current_user.id,
        name=annotation_in.name,
        annotation_type=annotation_in.annotation_type,
        geometry=annotation_in.geometry,
        properties=annotation_in.properties
    )
    db.add(annotation)
    db.commit()
    db.refresh(annotation)

    return annotation


@router.get("/{annotation_id}", response_model=schemas.Annotation)
async def get_annotation(
    annotation_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    annotation = db.query(models.Annotation).filter(models.Annotation.id == annotation_id).first()
    if not annotation:
        raise HTTPException(status_code=404, detail="Annotation not found")

    seismic = db.query(models.SeismicData).filter(
        models.SeismicData.id == annotation.seismic_data_id
    ).first()
    check_project_permission(current_user, seismic.project_id, "viewer", db)

    return annotation


@router.put("/{annotation_id}", response_model=schemas.Annotation)
async def update_annotation(
    annotation_id: int,
    annotation_in: schemas.AnnotationUpdate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    annotation = db.query(models.Annotation).filter(models.Annotation.id == annotation_id).first()
    if not annotation:
        raise HTTPException(status_code=404, detail="Annotation not found")

    seismic = db.query(models.SeismicData).filter(
        models.SeismicData.id == annotation.seismic_data_id
    ).first()

    if annotation.owner_id != current_user.id and not current_user.is_admin:
        check_project_permission(current_user, seismic.project_id, "editor", db)

    if annotation_in.name is not None:
        annotation.name = annotation_in.name
    if annotation_in.geometry is not None:
        annotation.geometry = annotation_in.geometry
    if annotation_in.properties is not None:
        annotation.properties = annotation_in.properties

    db.commit()
    db.refresh(annotation)

    return annotation


@router.delete("/{annotation_id}")
async def delete_annotation(
    annotation_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    annotation = db.query(models.Annotation).filter(models.Annotation.id == annotation_id).first()
    if not annotation:
        raise HTTPException(status_code=404, detail="Annotation not found")

    seismic = db.query(models.SeismicData).filter(
        models.SeismicData.id == annotation.seismic_data_id
    ).first()

    if annotation.owner_id != current_user.id and not current_user.is_admin:
        check_project_permission(current_user, seismic.project_id, "editor", db)

    db.delete(annotation)
    db.commit()

    return {"message": "Annotation deleted successfully"}
