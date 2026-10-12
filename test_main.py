
from fastapi.testclient import TestClient
from unittest.mock import patch
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

def test_placement_score_calculation():
    fake_student = {
        "id": 7,
        "name": "Arun Kumar",
        "college": "Vateswara College of Engineering",
        "skills": "Python, SQL, Data Structures",
        "placement_status": "Preparing",
    }

    fake_result = type(
        "FakeResult",
        (),
        {"mappings": lambda self: type(
            "FakeMappings",
            (),
            {"first": lambda self: fake_student}
        )()}
    )()

    fake_connection = type(
        "FakeConnection",
        (),
        {
            "__enter__": lambda self: self,
            "__exit__": lambda self, *args: None,
            "execute": lambda self, *args, **kwargs: fake_result,
        }
    )()

    with patch("main.engine.connect", return_value=fake_connection):
        response = client.get("/placement-score/7")

    assert response.status_code == 200

    data = response.json()
    assert data["placement_score"] == 70
    assert data["maximum_score"] == 100
    assert data["score_breakdown"]["technical_skills"]["points"] == 30
    assert data["score_breakdown"]["baseline"]["points"] == 20
    assert data["score_breakdown"]["preparation_status"]["points"] == 20


def test_placement_score_student_not_found():
    fake_result = type(
        "FakeResult",
        (),
        {"mappings": lambda self: type(
            "FakeMappings",
            (),
            {"first": lambda self: None}
        )()}
    )()

    fake_connection = type(
        "FakeConnection",
        (),
        {
            "__enter__": lambda self: self,
            "__exit__": lambda self, *args: None,
            "execute": lambda self, *args, **kwargs: fake_result,
        }
    )()

    with patch("main.engine.connect", return_value=fake_connection):
        response = client.get("/placement-score/999999")

    assert response.status_code == 404
    assert response.json()["detail"] == "Student not found"
