
import { useCallback, useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

const emptyForm = {
  name: "",
  college: "",
  skills: "Python, SQL",
  placement_status: "Preparing",
};

function App() {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [placementScore, setPlacementScore] = useState(null);
const [scoreLoading, setScoreLoading] = useState(false);
const [scoreError, setScoreError] = useState("")
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  
const [searchTerm, setSearchTerm] = useState("");
const [statusFilter, setStatusFilter] = useState("All");


  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/students`);

      if (!response.ok) {
        throw new Error("Could not load students.");
      }

      const data = await response.json();
      setStudents(Array.isArray(data) ? data : []);
    } catch {
      setError(
        "Cannot connect to the backend. Make sure your Python server is running."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);
  useEffect(() => {
  if (!selectedStudent) {
    setPlacementScore(null);
    return;
  }

  let cancelled = false;

  async function fetchScore() {
    setScoreLoading(true);
    setScoreError("");
    setPlacementScore(null);

    try {
      const response = await fetch(
        `${API_URL}/placement-score/${selectedStudent.id}`
      );

      if (!response.ok) {
        throw new Error("Could not load placement score.");
      }

      const data = await response.json();

      if (!cancelled) {
        setPlacementScore(data);
      }
    } catch (err) {
      if (!cancelled) {
        setScoreError(err.message);
      }
    } finally {
      if (!cancelled) {
        setScoreLoading(false);
      }
    }
  }

  fetchScore();

  return () => {
    cancelled = true;
  };
}, [selectedStudent]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!form.name.trim() || !form.college.trim()) {
      setError("Please enter the student's name and college.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      college: form.college.trim(),
      skills: form.skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean),
      placement_status: form.placement_status,
    };

    try {
      const response = await fetch(`${API_URL}/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.detail || "Could not add the student.");
      }

      setForm(emptyForm);
      setMessage("Student added successfully!");
      await loadStudents();
    } catch (err) {
      setError(
        err.message ||
          "Unable to add student. Check your backend and API settings."
      );
    }
  }

  const totalStudents = students.length;
  
const filteredStudents = students.filter((student) => {
  const search = searchTerm.toLowerCase();

  const matchesSearch =
    student.name.toLowerCase().includes(search) ||
    student.college.toLowerCase().includes(search);

  const matchesStatus =
    statusFilter === "All" ||
    student.placement_status === statusFilter;

  return matchesSearch && matchesStatus;
});

  const preparing = students.filter(
    (student) => student.placement_status === "Preparing"
  ).length;
  const placed = students.filter(
    (student) => student.placement_status === "Placed"
  ).length;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">STUDENT CAREER MANAGEMENT</p>
          <h1>Smart Placement Platform</h1>
          <p className="subtitle">
            Manage students and track placement preparation.
          </p>
        </div>

        <button
          className="secondary-button"
          type="button"
          onClick={loadStudents}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh data"}
        </button>
      </header>

      <section className="stats-grid" aria-label="Placement statistics">
        <article className="stat-card">
          <span>Total students</span>
          <strong>{totalStudents}</strong>
        </article>

        <article className="stat-card">
          <span>Preparing</span>
          <strong>{preparing}</strong>
        </article>

        <article className="stat-card">
          <span>Placed</span>
          <strong>{placed}</strong>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <h2>Add a student</h2>
          <p className="panel-description">
            Enter student details to save them to your backend.
          </p>

          <form onSubmit={handleSubmit}>
            <label htmlFor="student-name">Student name</label>
            <input
              id="student-name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter full name"
              required
            />

            <label htmlFor="student-college">College</label>
            <input
              id="student-college"
              name="college"
              value={form.college}
              onChange={handleChange}
              placeholder="Enter college name"
              required
            />

            <label htmlFor="student-skills">Skills</label>
            <input
              id="student-skills"
              name="skills"
              value={form.skills}
              onChange={handleChange}
              placeholder="Python, SQL, Data Structures"
            />
            <small>Separate skills with commas.</small>

            <label htmlFor="placement-status">Placement status</label>
            <select
              id="placement-status"
              name="placement_status"
              value={form.placement_status}
              onChange={handleChange}
            >
              <option value="Preparing">Preparing</option>
              <option value="Applied">Applied</option>
              <option value="Interviewing">Interviewing</option>
              <option value="Placed">Placed</option>
            </select>

            <button className="primary-button" type="submit">
              Add student
            </button>
          </form>

          {message && <p className="success-message">{message}</p>}
          {error && <p className="error-message">{error}</p>}
        </article>

        <article className="panel directory-panel">
          <div className="directory-heading">
            <div>
              <h2>Student directory</h2>
              <p className="panel-description">
                Students returned by your Python API.
              </p>
            </div>
            <span className="student-count">{totalStudents}</span>
          </div>
<div className="directory-filters">
  <input
    type="text"
    placeholder="Search by student or college..."
    value={searchTerm}
    onChange={(event) => setSearchTerm(event.target.value)}
  />

  <select
    value={statusFilter}
    onChange={(event) => setStatusFilter(event.target.value)}
  >
    <option value="All">All statuses</option>
    <option value="Preparing">Preparing</option>
    <option value="Applied">Applied</option>
    <option value="Interviewing">Interviewing</option>
    <option value="Placed">Placed</option>
  </select>
</div>


          {loading && students.length === 0 ? (
            <p>Loading students...</p>
          ) : students.length === 0 ? (
            <p className="empty-state">
              No students found. Add your first student using the form.
            </p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>College</th>
                    <th>Skills</th>
                    <th>Status</th>
                    <th>Placement score</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.id ?? student.name}>
                      <td>
                        <strong>{student.name}</strong>
                      </td>
                      <td>{student.college}</td>
                      <td>
                        {Array.isArray(student.skills)
                          ? student.skills.join(", ")
                          : student.skills}
                      </td>
                      <td>
                    <span className="status-pill">
                     {student.placement_status}
                    </span>
                    </td>
                    <td>
                    <button
                     type="button"
                     className="score-button"
                     onClick={() => setSelectedStudent(student)}
                     >
                     View score
                     </button>
                     </td> 
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
      
{selectedStudent && (
  <div className="score-modal-overlay">
    <div className="score-modal">
      <button
        type="button"
        className="score-close"
        onClick={(event) => {
  event.stopPropagation();
  setSelectedStudent(null);
}}
      >
      </button>

      <h2>Placement Score</h2>
      <h3>{selectedStudent.name}</h3>

      ```jsx
<div
  className="score-circle"
  style={{
    background: placementScore
      ? `conic-gradient(#5145e5 0% ${
          (placementScore.placement_score /
            placementScore.maximum_score) * 100
        }%, #e8e7f8 ${
          (placementScore.placement_score /
            placementScore.maximum_score) * 100
        }% 100%)`
      : "#e8e7f8",
  }}
>
  <div>
    <strong>
      {scoreLoading
        ? "..."
        : placementScore
          ? `${Math.round(
              (placementScore.placement_score /
                placementScore.maximum_score) * 100
            )}%`
          : "--"}
    </strong>
    <span>Placement score</span>
  </div>
</div>
{scoreError && (
  <p className="error-message">{scoreError}</p>
)}

{placementScore && (
  <>
    <p>
      <strong>Maximum score:</strong>{" "}
      {placementScore.maximum_score}
    </p>

    <p>
      <strong>Skills:</strong>{" "}
      {placementScore.skills}
    </p>

    <p>
      <strong>Status:</strong>{" "}
      {placementScore.placement_status}
    </p>
  </>
)}
      <p><strong>Skills:</strong> {Array.isArray(selectedStudent.skills)
        ? selectedStudent.skills.join(", ")
        : selectedStudent.skills}</p>
      <p><strong>Status:</strong> {selectedStudent.placement_status}</p>
    </div>
  </div>
)}

      <footer className="app-footer">
        Smart Placement Platform · Student progress dashboard
      </footer>
    </main>
  );}

export default App;



