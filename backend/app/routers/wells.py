from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas
from ..auth import get_current_active_user, check_project_permission

router = APIRouter(prefix="/wells", tags=["Wells"])


@router.get("/project/{project_id}", response_model=List[schemas.Well])
async def list_wells(
    project_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    check_project_permission(current_user, project_id, "viewer", db)

    wells = db.query(models.Well).filter(models.Well.project_id == project_id).all()
    return wells


@router.post("", response_model=schemas.Well)
async def create_well(
    well_in: schemas.WellCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    check_project_permission(current_user, well_in.project_id, "editor", db)

    well = models.Well(
        project_id=well_in.project_id,
        name=well_in.name,
        uwi=well_in.uwi,
        x=well_in.x,
        y=well_in.y,
        kb_elevation=well_in.kb_elevation,
        total_depth=well_in.total_depth
    )
    db.add(well)
    db.commit()
    db.refresh(well)

    return well


@router.get("/{well_id}", response_model=schemas.Well)
async def get_well(
    well_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    well = db.query(models.Well).filter(models.Well.id == well_id).first()
    if not well:
        raise HTTPException(status_code=404, detail="Well not found")

    check_project_permission(current_user, well.project_id, "viewer", db)

    return well


@router.put("/{well_id}", response_model=schemas.Well)
async def update_well(
    well_id: int,
    well_in: schemas.WellUpdate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    well = db.query(models.Well).filter(models.Well.id == well_id).first()
    if not well:
        raise HTTPException(status_code=404, detail="Well not found")

    check_project_permission(current_user, well.project_id, "editor", db)

    if well_in.name:
        well.name = well_in.name
    if well_in.uwi is not None:
        well.uwi = well_in.uwi
    if well_in.x is not None:
        well.x = well_in.x
    if well_in.y is not None:
        well.y = well_in.y
    if well_in.kb_elevation is not None:
        well.kb_elevation = well_in.kb_elevation
    if well_in.total_depth is not None:
        well.total_depth = well_in.total_depth

    db.commit()
    db.refresh(well)

    return well


@router.delete("/{well_id}")
async def delete_well(
    well_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    well = db.query(models.Well).filter(models.Well.id == well_id).first()
    if not well:
        raise HTTPException(status_code=404, detail="Well not found")

    check_project_permission(current_user, well.project_id, "editor", db)

    db.delete(well)
    db.commit()

    return {"message": "Well deleted successfully"}
