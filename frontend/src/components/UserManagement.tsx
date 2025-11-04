import React, { useState, useEffect } from "react"
import {
  Row,
  Col,
  Card,
  Table,
  Button,
  Modal,
  Form,
  Badge,
  Spinner,
  Alert,
  Pagination
} from "react-bootstrap"
import {
  UserPlus,
  Edit,
  Shield,
  Users,
  Trash,
  Key,
  Eye,
  EyeOff,
  Download,
  Settings,
  ShieldOff
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import RecordViewModal from './RecordViewModal'
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"
import { saveAs } from "file-saver"
 
interface UserProfile {
  name: string
  department: string
  position: string
}

interface UserType {
  id: number
  email: string
  role: string
  active: boolean
  profile: UserProfile
  created_at: string
}

function UserManagement() {
  const { API } = useAuth()
  const { user } = useAuth()
  const [users, setUsers] = useState<UserType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [roleFilter, setRoleFilter] = useState<string>("All")
  const [usersPerPage, setUsersPerPage] = useState<number>(10)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<UserType | null>(null)
  const [form, setForm] = useState({
    email: "",
    role: "Viewer",
    name: "",
    department: "",
    position: "",   
    password: "", 
    confirmPassword: "",  
  })


  const [showResetModal, setShowResetModal] = useState(false)
  const [resetUser, setResetUser] = useState<UserType | null>(null)
  const [resetForm, setResetForm] = useState({ newPassword: "", confirmPassword: "" })
  const [showAddPassword, setShowAddPassword] = useState(false)
  const [showResetPasswordField, setShowResetPasswordField] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");

  const handleToggleActive = async (user: UserType) => {
  if (!window.confirm(`Are you sure you want to ${user.active ? "deactivate" : "activate"} this account?`))
    return;

  try {
    await API.put(`users/${user.id}/toggle-active`, { active: !user.active });
    setSuccess(`User ${user.active ? "deactivated" : "activated"} successfully`);
    fetchUsers();
  } catch (err: any) {
    setError(err.response?.data?.detail || "Failed to update user status");
  }
};

  // Password strength helpers
  const getPasswordScore = (pw: string) => {
    if (!pw) return 0
    let score = 0
    if (pw.length >= 8) score += 1
    if (pw.length >= 12) score += 1
    if (/[A-Z]/.test(pw)) score += 1
    if (/[0-9]/.test(pw)) score += 1
    if (/[^A-Za-z0-9]/.test(pw)) score += 1
    return Math.min(100, (score / 5) * 100)
  }

  const getStrengthLabel = (score: number) => {
    if (score === 0) return { label: 'Too short', color: '#e0e0e0' }
    if (score < 40) return { label: 'Weak', color: '#f86c6b' }
    if (score < 70) return { label: 'Medium', color: '#f0ad4e' }
    return { label: 'Strong', color: '#28a745' }
  }

  const [showViewModal, setShowViewModal] = useState(false)
  const [viewedUser, setViewedUser] = useState<UserType | null>(null)

  const totalUsers = users.length
  const adminCount = users.filter((u) => u.role === "Admin").length
  const viewerCount = users.filter((u) => u.role === "Viewer").length

  // Derived filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch = searchTerm.trim() === "" || `${u.profile?.name || u.email}`.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === "All" || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / usersPerPage))
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await API.get("users")
      setUsers(response.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to fetch users")
    } finally {
      setLoading(false)
    }
  }
const handleShowAdd = () => {
  setEditingUser(null);
  setForm({
    email: "",
    role: "Viewer",
    name: "",
    department: "",
    position: "",
    password: "",
    confirmPassword: "",
  });
  setModalError("");  // clear
  setModalSuccess(""); // clear
  setShowModal(true);
};

  const handleShowEdit = (user: UserType) => {
    setEditingUser(user)
    setForm({
      email: user.email,
      role: user.role,
      name: user.profile?.name || "",
      department: user.profile?.department || "",
      position: user.profile?.position || "",   
      password: "",
      confirmPassword: "",
    })
    setShowModal(true)
  }

  const handleFormChange: React.ChangeEventHandler<any> = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

const handleSaveUser = async () => {
  setSaving(true);
  setModalError("");
  setModalSuccess("");

  try {
    // Make a copy of form and exclude confirmPassword
    const { confirmPassword, ...payload } = form;

    if (editingUser) {
      await API.put(`users/${editingUser.id}`, payload);
      setModalSuccess("User updated successfully");
    } else {
      await API.post("users", payload);
      setModalSuccess("User added successfully");
    }

    // Close modal after short delay so success is visible
    setTimeout(() => {
      setShowModal(false);
      setModalSuccess("");
      fetchUsers();
    }, 1200);

  } catch (err: any) {
    setModalError(err.response?.data?.detail || "Failed to save user");
  } finally {
    setSaving(false);
  }
};



  const handleShowResetPassword = (user: UserType) => {
    setResetUser(user)
    setResetForm({ newPassword: "", confirmPassword: "" })
    setShowResetModal(true)
  }

const handleResetPassword = async () => {
  if (!resetForm.newPassword || !resetForm.confirmPassword) {
    setResetError("Both password fields are required");
    return;
  }
  if (resetForm.newPassword.length < 6) {
    setResetError("Password must be at least 6 characters long");
    return;
  }
  if (resetForm.newPassword !== resetForm.confirmPassword) {
    setResetError("Passwords do not match");
    return;
  }

  setSaving(true);
  setResetError("");
  setResetSuccess("");
  try {
    await API.post(`users/${resetUser?.id}/reset-password`, resetForm);
    setResetSuccess("Password successfully updated!");
    setTimeout(() => {
      setShowResetModal(false);
      setResetSuccess("");
    }, 1500);
  } catch (err: any) {
    setResetError(err.response?.data?.detail || "Failed to reset password");
  } finally {
    setSaving(false);
  }
};



  const handleDeleteUser = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return
    try {
      await API.delete(`users/${id}`)
      setSuccess("User deleted successfully")
      fetchUsers()
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to delete user")
    }
    const header = ["ID", "Email", "Role", "Name", "Department", "Position", "Status", "Created"] 
    const rows = users.map((u) => [
      u.id,
      u.email,
      u.role,
      u.profile?.name || "",
      u.profile?.department || "",
      u.profile?.position || "",   
      u.active ? "Active" : "Inactive",
      new Date(u.created_at).toLocaleString(),
    ])
    const csvContent = [header, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", "users.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }


  // --- 📄 Download PDF ---
  const handleDownloadPDF = () => {
    if (users.length === 0) {
      setError("No users available to download")
      return
    }

    const doc = new jsPDF()
    doc.text("User List", 14, 15)

    const tableData = users.map((u) => [
      u.id,
      u.email,
      u.role,
      u.profile?.name || "",
      u.profile?.department || "",
      u.profile?.position || "",
      u.active ? "Active" : "Inactive",
      new Date(u.created_at).toLocaleDateString(),
    ])

    autoTable(doc, {
      head: [["ID", "Email", "Role", "Name", "Department", "Position", "Status", "Created"]],
      body: tableData,
      startY: 20,
      theme: "grid",
    })

    doc.save("users.pdf")
  }

  const handleDownloadCSV = () => {
    if (users.length === 0) {
      setError("No users available to download")
      return
    }
    const header = ["ID", "Email", "Role", "Name", "Department", "Position", "Status", "Created"]
    const rows = users.map((u) => [
      u.id,
      u.email,
      u.role,
      u.profile?.name || "",
      u.profile?.department || "",
      u.profile?.position || "",
      u.active ? "Active" : "Inactive",
      new Date(u.created_at).toLocaleString(),
    ])
    const csvContent = [header, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", "users.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }


  // --- 📑 Download Excel ---
  const handleDownloadExcel = () => {
    if (users.length === 0) {
      setError("No users available to download")
      return
    }
    const worksheetData = users.map((u) => ({
      ID: u.id,
      Email: u.email,
      Role: u.role,
      Name: u.profile?.name || "",
      Department: u.profile?.department || "",
      Position: u.profile?.position || "",   // ✅ added
      Status: u.active ? "Active" : "Inactive",
      Created: new Date(u.created_at).toLocaleString(),
    }))
    const worksheet = XLSX.utils.json_to_sheet(worksheetData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users")
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" })
    saveAs(blob, "users.xlsx")
  }


  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "Admin":
        return "danger"
      case "OSAS":
        return "warning"
      case "Viewer":
        return "info"
      default:
        return "secondary"
    }
  }

  if (user?.role !== "Admin") {
    return (
      <Alert variant="warning">
        You don&apos;t have permission to access user management. Only Admins
        can manage users.
      </Alert>
    )
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: "400px" }}>
        <Spinner animation="border" variant="primary" />
      </div>
    )
  }

  return (
  <div className="fade-in">
    <div className="d-flex flex-wrap justify-content-between align-items-center mb-2 gap-2">
      <div className="d-flex align-items-center gap-3 flex-wrap">
        <h2 className="fw-bold mb-0 me-3">User Management</h2>
      </div>
    </div>


    {/* Toolbar: search, role filter, show selector, download buttons */}
    <div className="mb-3 d-flex justify-content-between align-items-center gap-3">
      <div className="d-flex gap-2 align-items-center">
        <Form.Control size="sm" placeholder="Search users by name or email..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} style={{ minWidth: 260 }} />
        <Form.Select size="sm" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }} style={{ width: 140 }}>
          <option value="All">All roles</option>
          <option value="Admin">Admin</option>
          <option value="Viewer">Viewer</option>
        </Form.Select>
        <Form.Label className="small fw-semibold">Show:</Form.Label>
        <Form.Select size="sm" value={usersPerPage} onChange={(e) => { setUsersPerPage(Number(e.target.value)); setCurrentPage(1); }} style={{ width: 120 }}>
          <option value={5}>5 rows</option>
          <option value={10}>10 rows</option>
          <option value={15}>15 rows</option>
          <option value={20}>20 rows</option>
        </Form.Select>
      </div>
      <div className="d-flex gap-2">
        <Button variant="outline-success" onClick={handleDownloadCSV} size="sm">
          <Download size={14} className="me-1" /> CSV
        </Button>
        <Button variant="outline-danger" onClick={handleDownloadPDF} size="sm">
          <Download size={14} className="me-1" /> PDF
        </Button>
        <Button variant="outline-info" onClick={handleDownloadExcel} size="sm">
          <Download size={14} className="me-1" /> Excel
        </Button>
      </div>
    </div>



      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {/* Stats */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <Users size={40} className="text-primary mb-2" />
              <h4 className="fw-bold">{totalUsers}</h4>
              <p className="text-muted mb-0">Total Users</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <Shield size={40} className="text-danger mb-2" />
              <h4 className="fw-bold">{adminCount}</h4>
              <p className="text-muted mb-0">Admins</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <Shield size={40} className="text-info mb-2" />
              <h4 className="fw-bold">{viewerCount}</h4>
              <p className="text-muted mb-0">Viewers</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Add User button placed above the users table, right aligned */}
      <div className="d-flex justify-content-end mb-3">
        <Button variant="outline-primary" onClick={handleShowAdd} className="d-flex align-items-center px-4 py-2 fw-bold shadow-sm">
          <UserPlus size={16} className="me-2" /> Add User
        </Button>
      </div>

      {/* Users Table */}
      <Card>
        <Card.Header>
          <h6 className="mb-0 fw-bold">System Users</h6>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table striped hover className="mb-0 users-table table-sm responsive-card-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Position</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                  {paginatedUsers.map((u) => (
                    <tr key={u.id} onClick={() => { setViewedUser(u); setShowViewModal(true); }} style={{ cursor: 'pointer' }}>
                      <td data-label="User">
                        <div>
                          <div className="fw-semibold">{u.profile?.name || "No Name"}</div>
                          <small className="text-muted">ID: {u.id}</small>
                        </div>
                      </td>
                      <td data-label="Email">{u.email}</td>
                      <td data-label="Role"><Badge bg={getRoleBadgeVariant(u.role)}>{u.role}</Badge></td>
                      <td data-label="Department">{u.profile?.department || "N/A"}</td>
                      <td data-label="Position">{u.profile?.position || "N/A"}</td>   
                      <td data-label="Status">
                        <Badge bg={u.active ? "success" : "secondary"}>
                          {u.active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td data-label="Created">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td data-label="Actions" className="text-nowrap">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="me-2"
                          title="Edit User"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShowEdit(u);
                          }}
                        >
                          <Edit size={14} />
                        </Button>

                        <Button
                          variant="outline-secondary"
                          size="sm"
                          className="me-2"
                          title="Reset Password"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShowResetPassword(u);
                          }}
                        >
                          <Key size={14} />
                        </Button>

                        <Button
                          variant={u.active ? "outline-danger" : "outline-success"}
                          size="sm"
                          title={u.active ? "Deactivate User" : "Activate User"}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleActive(u);
                          }}
                        >
                          {u.active ? <ShieldOff size={14} /> : <Shield size={14} />}
                        </Button>
                        
                        <Button
                          variant="outline-danger"
                          size="sm"
                          className="me-2"
                          title="Delete User"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteUser(u.id);
                          }}
                        >
                          <Trash size={14} />
                        </Button>
                      </td>

                    </tr>
                  ))}
              </tbody>
            </Table>
          </div>
        </Card.Body>
        {totalPages > 1 && (
          <Card.Footer className="d-flex flex-column flex-md-row justify-content-between align-items-center bg-light px-4 py-3">
            <span className="small text-muted mb-2 mb-md-0">
              Showing {(currentPage - 1) * usersPerPage + 1} – {Math.min(currentPage * usersPerPage, filteredUsers.length)} of {filteredUsers.length} users (Page {currentPage} of {totalPages})
            </span>

            <div className="d-flex align-items-center">
              <Button variant="outline-success" size="sm" className="me-2"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}>
                Prev
              </Button>

              <Pagination className="mb-0">
                {currentPage > 3 && (
                  <>
                    <Pagination.Item onClick={() => setCurrentPage(1)}>1</Pagination.Item>
                    <Pagination.Ellipsis disabled />
                  </>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
                  .map((page) => (
                    <Pagination.Item key={page} active={page === currentPage}
                      onClick={() => setCurrentPage(page)}>
                      {page}
                    </Pagination.Item>
                  ))}
                {currentPage < totalPages - 2 && (
                  <>
                    <Pagination.Ellipsis disabled />
                    <Pagination.Item onClick={() => setCurrentPage(totalPages)}>
                      {totalPages}
                    </Pagination.Item>
                  </>
                )}
              </Pagination>

              <Button variant="outline-success" size="sm" className="ms-2"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}>
                Next
              </Button>
            </div>
          </Card.Footer>
        )}
      </Card>

      {/* Read-only view modal for users */}
      <RecordViewModal
        show={showViewModal}
        onHide={() => setShowViewModal(false)}
        title={viewedUser ? `${viewedUser.profile?.name || viewedUser.email}` : 'User Details'}
        fields={viewedUser ? [
          { label: 'Name', value: viewedUser.profile?.name || '—' },
          { label: 'Email', value: viewedUser.email },
          { label: 'Role', value: viewedUser.role },
          { label: 'Department', value: viewedUser.profile?.department || '—' },
          { label: 'Position', value: viewedUser.profile?.position || '—' },
          { label: 'Status', value: viewedUser.active ? 'Active' : 'Inactive' },
          { label: 'Created', value: new Date(viewedUser.created_at).toLocaleString() },
        ] : []}
      />

      {/* Add/Edit User Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editingUser ? "Edit User" : "Add New User"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Show error/success inside modal */}
          {modalError && <Alert variant="danger">{modalError}</Alert>}
          {modalSuccess && <Alert variant="success">{modalSuccess}</Alert>}

          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={form.email}
                onChange={handleFormChange}
                disabled={!!editingUser}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={form.name}
                onChange={handleFormChange}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Department</Form.Label>
              <Form.Control
                type="text"
                name="department"
                value={form.department}
                onChange={handleFormChange}
              />
            </Form.Group>

            <Form.Label>Position</Form.Label>
            <Form.Control
              type="text"
              name="position"
              value={form.position}
              onChange={handleFormChange}
            />

            {/* Password + Confirm Password only when adding */}
            {!editingUser && (
              <>
                <Form.Group className="mb-3 mt-3">
                  <Form.Label>Password</Form.Label>
                  <div className="d-flex">
                    <Form.Control
                      type={showAddPassword ? "text" : "password"}
                      name="password"
                      value={form.password}
                      onChange={handleFormChange}
                    />
                    <Button
                      variant="outline-secondary"
                      onClick={() => setShowAddPassword(!showAddPassword)}
                      className="ms-2"
                    >
                      {showAddPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </Button>
                  </div>
                  {/* Real-time password length warning */}
                  {form.password && form.password.length > 0 && form.password.length < 6 && (
                    <Form.Text className="text-danger">
                      Password must be at least 6 characters
                    </Form.Text>
                  )}
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Confirm Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={form.confirmPassword || ""}
                    onChange={(e) =>
                      setForm({ ...form, confirmPassword: e.target.value })
                    }
                  />
                  {/* Real-time password mismatch warning */}
                  {form.confirmPassword &&
                    form.password !== form.confirmPassword && (
                      <Form.Text className="text-danger">
                        Passwords do not match
                      </Form.Text>
                    )}
                </Form.Group>
              </>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Role</Form.Label>
              <Form.Select
                name="role"
                value={form.role}
                onChange={handleFormChange}
              >
                <option value="Admin">Admin</option>
                <option value="Viewer">Viewer</option>
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveUser}
            disabled={
              saving ||
              (!editingUser &&
                (form.password.length < 6 ||
                  form.password !== form.confirmPassword))
            }
          >
            {saving ? <Spinner size="sm" animation="border" /> : "Save"}
          </Button>
        </Modal.Footer>
      </Modal>



      {/* Reset Password Modal */}
      <Modal show={showResetModal} onHide={() => setShowResetModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Reset Password</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Local error/success feedback */}
          {resetError && <Alert variant="danger">{resetError}</Alert>}
          {resetSuccess && <Alert variant="success">{resetSuccess}</Alert>}

          <Form>
          <Form.Group className="mb-3">
            <Form.Label>New Password</Form.Label>
            <div className="d-flex">
              <Form.Control
                type={showResetPasswordField ? "text" : "password"}
                value={resetForm.newPassword}
                onChange={(e) =>
                  setResetForm({ ...resetForm, newPassword: e.target.value })
                }
              />
              <Button
                variant="outline-secondary"
                onClick={() =>
                  setShowResetPasswordField(!showResetPasswordField)
                }
                className="ms-2"
              >
                {showResetPasswordField ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
            </div>

            {/* Strength meter */}
            <div className="mt-2">
              {(() => {
                const score = getPasswordScore(resetForm.newPassword)
                const info = getStrengthLabel(score)
                return (
                  <>
                    <div style={{ height: 8, background: '#e9ecef', borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{ width: `${score}%`, height: '100%', background: info.color }} />
                    </div>
                    <small className="text-muted">{info.label} • {resetForm.newPassword.length} chars</small>
                  </>
                )
              })()}
            </div>
            {resetForm.newPassword && resetForm.newPassword.length > 0 && resetForm.newPassword.length < 6 && (
              <Form.Text className="text-danger">
                Password must be at least 6 characters
              </Form.Text>
            )}
          </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Confirm Password</Form.Label>
              <Form.Control
                type="password"
                value={resetForm.confirmPassword}
                onChange={(e) =>
                  setResetForm({ ...resetForm, confirmPassword: e.target.value })
                }
              />
              {resetForm.confirmPassword && resetForm.newPassword !== resetForm.confirmPassword && (
                <Form.Text className="text-danger">Passwords do not match</Form.Text>
              )}
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowResetModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleResetPassword}
            disabled={saving || resetForm.newPassword.length < 6 || resetForm.newPassword !== resetForm.confirmPassword}
          >
            {saving ? <Spinner size="sm" animation="border" /> : "Update Password"}
          </Button>
        </Modal.Footer>
      </Modal>


    </div>
  )
}

export default UserManagement
