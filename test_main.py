
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")

    assert response.status_code == 200


def test_invalid_student_name():
    response = client.post(
        "/students",
        json={
            "name": "   ",
            "college": "Vateswara College of Engineering",
            "skills": ["Python"],
            "placement_status": "Preparing",
        },
    )

    assert response.status_code == 422


def test_invalid_placement_status():
    response = client.post(
        "/students",
        json={
            "name": "Test Student",
            "college": "Test College",
            "skills": ["Python"],
            "placement_status": "Unknown",
        },
    )

    assert response.status_code == 422
