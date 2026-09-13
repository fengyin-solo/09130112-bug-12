from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas
from ..auth import get_current_active_user, check_project_permission

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.get("", response_model=List[schemas.Project])
async def list_projects(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.is_admin:
        projects = db.query(models.Project).all()
    else:
        owned = db.query(models.Project).filter(models.Project.created_by == current_user.id)
        member = db.query(models.Project).join(models.ProjectMember).filter(
            models.ProjectMember.user_id == current_user.id
        )
        projects = list(set(owned.all() + member.all()))

    return projects


@router.post("", response_model=schemas.Project)
async def create_project(
    project_in: schemas.ProjectCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    project = models.Project(
        name=project_in.name,
        description=project_in.description,
        created_by=current_user.id
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    membership = models.ProjectMember(
        project_id=project.id,
        user_id=current_user.id,
        role="owner"
    )
    db.add(membership)
    db.commit()

    return project


@router.get("/{project_id}", response_model=schemas.Project)
async def get_project(
    project_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    check_project_permission(current_user, project_id, "viewer", db)

    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return project


@router.put("/{project_id}", response_model=schemas.Project)
async def update_project(
    project_id: int,
    project_in: schemas.ProjectUpdate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    check_project_permission(current_user, project_id, "editor", db)

    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project_in.name:
        project.name = project_in.name
    if project_in.description is not None:
        project.description = project_in.description

    db.commit()
    db.refresh(project)

    return project


@router.delete("/{project_id}")
async def delete_project(
    project_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    check_project_permission(current_user, project_id, "owner", db)

    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    db.delete(project)
    db.commit()

    return {"message": "Project deleted successfully"}


@router.get("/{project_id}/members", response_model=List[schemas.ProjectMember])
async def list_project_members(
    project_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    check_project_permission(current_user, project_id, "viewer", db)

    members = db.query(models.ProjectMember).filter(
        models.ProjectMember.project_id == project_id
    ).all()

    return members


@router.post("/{project_id}/members", response_model=schemas.ProjectMember)
async def add_project_member(
    project_id: int,
    member_in: schemas.ProjectMemberCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    check_project_permission(current_user, project_id, "owner", db)

    existing = db.query(models.ProjectMember).filter(
        models.ProjectMember.project_id == project_id,
        models.ProjectMember.user_id == member_in.user_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this project"
        )

    user = db.query(models.User).filter(models.User.id == member_in.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    member = models.ProjectMember(
        project_id=project_id,
        user_id=member_in.user_id,
        role=member_in.role
    )
    db.add(member)
    db.commit()
    db.refresh(member)

    return member


@router.put("/{project_id}/members/{member_id}", response_model=schemas.ProjectMember)
async def update_project_member(
    project_id: int,
    member_id: int,
    member_in: schemas.ProjectMemberUpdate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    check_project_permission(current_user, project_id, "owner", db)

    member = db.query(models.ProjectMember).filter(
        models.ProjectMember.id == member_id,
        models.ProjectMember.project_id == project_id
    ).first()

    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if member_in.role:
        member.role = member_in.role

    db.commit()
    db.refresh(member)

    return member


@router.delete("/{project_id}/members/{member_id}")
async def remove_project_member(
    project_id: int,
    member_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    check_project_permission(current_user, project_id, "owner", db)

    member = db.query(models.ProjectMember).filter(
        models.ProjectMember.id == member_id,
        models.ProjectMember.project_id == project_id
    ).first()

    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    db.delete(member)
    db.commit()

    return {"message": "Member removed successfully"}
