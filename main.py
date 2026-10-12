
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException 
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

# Load environment variables from .env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Configure the PostgreSQL connection
engine = None

if DATABASE_URL:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True
    )

app = FastAPI(title="Smart Placement Platform")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request model for student data
class StudentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    college: str = Field(min_length=1, max_length=150)
    skills: list[str] = Field(default_factory=list)
    placement_status: str = Field(
        default="Preparing",
        max_length=50
    )


# Home endpoint
@app.get("/")
def home():
    return {"message": "Smart Placement Platform is running!"}


# Student information endpoint
@app.get("/student")
def get_student():
    return {
        "name": "Your Name",
        "college": "Your College",
        "skills": ["Python", "SQL"],
        "placement_status": "Preparing"
    }


# Test PostgreSQL connection
@app.get("/db-check")
def db_check():
    if engine is None:
        raise HTTPException(
            status_code=503,
            detail="DATABASE_URL is missing from the .env file"
        )

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {"database": "connected"}

    except SQLAlchemyError as error:
        print(f"Database connection error: {error}")

        raise HTTPException(
            status_code=503,
            detail="Database connection failed. Check PostgreSQL credentials and configuration."
        )


# Create a student record
@app.post("/students")
def create_student(student: StudentCreate):
    if engine is None:
        raise HTTPException(
            status_code=503,
            detail="Database configuration is missing"
        )

    try:
        with engine.begin() as connection:
            result = connection.execute(
                text("""
                    INSERT INTO students
                        (name, college, skills, placement_status)
                    VALUES
                        (:name, :college, :skills, :placement_status)
                    RETURNING id, name, college, skills, placement_status
                """),
                {
                    "name": student.name,
                    "college": student.college,
                    "skills": ", ".join(student.skills),
                    "placement_status": student.placement_status
                }
            )

            row = result.mappings().one()

            return {
                "message": "Student created successfully",
                "student": dict(row)
            }

    except SQLAlchemyError as error:
        print(f"Create student error: {error}")

        raise HTTPException(
            status_code=500,
            detail="Could not create student. Check the database table."
        )


# Retrieve all students

@app.get("/students")
def get_students():
    try:
        with engine.connect() as connection:
            result = connection.execute(
                text("""
                    SELECT id, name, college, skills, placement_status
                    FROM students
                    ORDER BY id
                """)
            )

            return [
                dict(row)
                for row in result.mappings().all()
            ]

    except SQLAlchemyError as error:
        print(f"Get students error: {error}")
        raise HTTPException(
            status_code=500,
            detail="Could not retrieve students. Check the database table."
        )

@app.get("/placement-score/{student_id}")
def get_placement_score(student_id: int):
    try:
        with engine.connect() as connection:
            result = connection.execute(
                text("""
                    SELECT id, name, college, skills, placement_status
                    FROM students
                    WHERE id = :student_id
                """),
                {"student_id": student_id}
            )

            student = result.mappings().first()

            if student is None:
                raise HTTPException(
                    status_code=404,
                    detail="Student not found"
                )

            skills = student["skills"] or []

            # Score based on the number of recorded skills.
            skill_score = min(len(skills) * 10, 40)

            # Initial baseline score.
            baseline_score = 20

            # Add points for placement preparation status.
            status = (student["placement_status"] or "").lower()

            if status == "ready":
                preparation_score = 40
            elif status in ("preparing", "in progress"):
                preparation_score = 20
            else:
                preparation_score = 0

            total_score = min(
                skill_score + baseline_score + preparation_score,
                100
            )

            return {
                "student_id": student["id"],
                "name": student["name"],
                "placement_score": total_score,
                "maximum_score": 100,
                "skills": skills,
                "placement_status": student["placement_status"]
            }

    except SQLAlchemyError as error:
        print(f"Placement score error: {error}")
        raise HTTPException(
            status_code=500,
            detail="Could not calculate placement score"
        )
