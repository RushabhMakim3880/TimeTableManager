-- ==========================================================
-- School Management ERP - Core Relational Database Schema
-- Phase 1: Authentication, RBAC, Auditing & Master Foundation
-- ==========================================================

PRAGMA foreign_keys = ON;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL COLLATE NOCASE,
    email TEXT UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    user_type TEXT NOT NULL, -- 'PRINCIPAL', 'ACADEMIC', 'ADMIN', 'TEACHER', 'STAFF'
    teacher_code TEXT,       -- Reference to faculty (e.g., 'T01', 'T02')
    avatar TEXT DEFAULT '👤',
    is_active INTEGER NOT NULL DEFAULT 1,
    must_change_password INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL, -- e.g. 'PRINCIPAL', 'ACADEMIC_HEAD', 'TIMETABLE_COORDINATOR', 'TEACHER', 'ADMIN_HEAD', 'ACCOUNTANT'
    name TEXT NOT NULL,
    workspace TEXT NOT NULL,   -- 'PRINCIPAL', 'ACADEMIC', 'ADMINISTRATION'
    description TEXT,
    is_system INTEGER NOT NULL DEFAULT 1
);

-- 3. Permissions Table
CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL, -- e.g. 'academic.timetable.view', 'academic.timetable.edit'
    domain TEXT NOT NULL,      -- 'ACADEMIC', 'ADMIN', 'PRINCIPAL', 'SYSTEM'
    module TEXT NOT NULL,      -- 'timetable', 'attendance', 'fees', 'exams', 'staff', 'users', etc.
    action TEXT NOT NULL,      -- 'view', 'create', 'edit', 'delete', 'approve', 'publish', 'export', 'manage'
    description TEXT
);

-- 4. Role Permissions Mapping
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 5. User Roles Mapping
CREATE TABLE IF NOT EXISTS user_roles (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- 6. Audit Logs Table (Immutable Action Trail)
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    username TEXT NOT NULL,
    role TEXT,
    action TEXT NOT NULL,       -- e.g. 'AUTH_LOGIN', 'TIMETABLE_PUBLISH', 'USER_CREATE'
    resource TEXT NOT NULL,     -- e.g. 'auth', 'timetable', 'user'
    resource_id TEXT,
    details TEXT,               -- JSON payload describing the mutation
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. Organizational Master Foundation (Schools & Sessions)
CREATE TABLE IF NOT EXISTS schools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    affiliation_no TEXT,
    tagline TEXT,
    logo_url TEXT,
    board TEXT DEFAULT 'CBSE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS academic_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
    session_name TEXT NOT NULL, -- e.g. '2026-2027'
    start_date DATE,
    end_date DATE,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. Standards / Grades Master
CREATE TABLE IF NOT EXISTS standards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL, -- e.g. 'std_nursery', 'std_1', 'std_3'
    name TEXT NOT NULL,        -- e.g. 'Nursery', 'Standard: 1st', 'Standard: 3rd'
    shift TEXT NOT NULL DEFAULT 'afternoon', -- 'morning', 'afternoon'
    room_number TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    capacity INTEGER DEFAULT 45,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 9. Sections / Divisions Master
CREATE TABLE IF NOT EXISTS sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    standard_id INTEGER NOT NULL REFERENCES standards(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'A', -- 'A', 'B', etc.
    room_number TEXT,
    class_teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    capacity INTEGER DEFAULT 45,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(standard_id, name)
);

-- 10. Subjects Master
CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL, -- e.g. 'ENG', 'MATH'
    name TEXT NOT NULL,        -- e.g. 'English', 'Maths'
    category TEXT NOT NULL DEFAULT 'Core', -- 'Core', 'Language', 'Science', 'Activity', 'Skill'
    color TEXT DEFAULT '#3b82f6',
    weekly_quota INTEGER DEFAULT 6,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 11. Staff HR Profiles
CREATE TABLE IF NOT EXISTS staff_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    employee_code TEXT UNIQUE NOT NULL, -- e.g. 'EMP-101'
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    gender TEXT DEFAULT 'Female',
    designation TEXT NOT NULL, -- 'Senior Teacher', 'Assistant Teacher', 'Principal', etc.
    department TEXT NOT NULL,  -- 'Languages', 'Mathematics', 'Sciences', 'Administration', 'IT'
    qualification TEXT,        -- 'M.Sc. B.Ed.', 'M.A. B.Ed.'
    date_of_joining DATE,
    phone TEXT,
    email TEXT,
    emergency_contact TEXT,
    address TEXT,
    blood_group TEXT,
    primary_subject TEXT,
    assigned_shift TEXT DEFAULT 'afternoon',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 12. Students Master (General Register)
CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gr_number TEXT UNIQUE NOT NULL,      -- General Register Number, e.g. 'GR-2026-001'
    admission_no TEXT UNIQUE NOT NULL,   -- e.g. 'ADM-2026-001'
    roll_no INTEGER,
    first_name TEXT NOT NULL,
    middle_name TEXT,
    last_name TEXT NOT NULL,
    gender TEXT NOT NULL,                -- 'Male', 'Female', 'Other'
    dob DATE,
    blood_group TEXT,
    category TEXT DEFAULT 'General',     -- 'General', 'OBC', 'SC', 'ST', 'EWS'
    standard_id INTEGER NOT NULL REFERENCES standards(id) ON DELETE RESTRICT,
    section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL,
    admission_date DATE DEFAULT (date('now')),
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'ALUMNI', 'TRANSFERRED', 'WITHDRAWN'
    emergency_phone TEXT,
    address TEXT,
    photo_url TEXT,
    remarks TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 13. Parents / Guardians
CREATE TABLE IF NOT EXISTS parents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    father_name TEXT,
    mother_name TEXT,
    primary_phone TEXT NOT NULL,
    secondary_phone TEXT,
    email TEXT,
    occupation TEXT,
    annual_income TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 14. Student - Parent Relationship Mapping
CREATE TABLE IF NOT EXISTS student_parents (
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    parent_id INTEGER NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    relationship TEXT NOT NULL DEFAULT 'PARENTS', -- 'PARENTS', 'FATHER', 'MOTHER', 'GUARDIAN'
    is_primary INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (student_id, parent_id)
);

-- 15. Student Documents
CREATE TABLE IF NOT EXISTS student_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL, -- 'BIRTH_CERTIFICATE', 'AADHAR', 'TRANSFER_CERTIFICATE', 'PREVIOUS_MARKSHEET', 'CASTE_CERTIFICATE'
    document_name TEXT NOT NULL,
    file_url TEXT,
    verification_status TEXT NOT NULL DEFAULT 'VERIFIED', -- 'PENDING', 'VERIFIED', 'REJECTED'
    verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performant queries
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_roles_code ON roles(code);
CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(code);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_standards_code ON standards(code);
CREATE INDEX IF NOT EXISTS idx_sections_standard ON sections(standard_id);
CREATE INDEX IF NOT EXISTS idx_subjects_code ON subjects(code);
CREATE INDEX IF NOT EXISTS idx_staff_emp_code ON staff_profiles(employee_code);
CREATE INDEX IF NOT EXISTS idx_students_gr ON students(gr_number);
CREATE INDEX IF NOT EXISTS idx_students_standard ON students(standard_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
