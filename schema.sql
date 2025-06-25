
-- Tabla para usuarios
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin', 'referee')) NOT NULL
);

-- Tabla para clubes/ligas
CREATE TABLE IF NOT EXISTS clubs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    admin_user_id TEXT NOT NULL,
    FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabla para la membresía de usuarios a clubes
CREATE TABLE IF NOT EXISTS user_clubs_membership (
    user_id TEXT NOT NULL,
    club_id TEXT NOT NULL,
    PRIMARY KEY (user_id, club_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

-- Tabla para los partidos/turnos definidos por un club
CREATE TABLE IF NOT EXISTS club_matches (
    id TEXT PRIMARY KEY,
    club_id TEXT NOT NULL,
    description TEXT NOT NULL,
    match_date TEXT NOT NULL,
    match_time TEXT NOT NULL,
    location TEXT NOT NULL,
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

-- Tabla para las postulaciones de disponibilidad de los árbitros
CREATE TABLE IF NOT EXISTS shift_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    club_id TEXT NOT NULL,
    has_car INTEGER NOT NULL, -- 0 for false, 1 for true
    notes TEXT,
    status TEXT CHECK(status IN ('pending', 'completed')) NOT NULL DEFAULT 'pending',
    submitted_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

-- Tabla intermedia para los partidos seleccionados en una postulación
CREATE TABLE IF NOT EXISTS shift_request_matches (
    request_id TEXT NOT NULL,
    match_id TEXT NOT NULL,
    PRIMARY KEY (request_id, match_id),
    FOREIGN KEY (request_id) REFERENCES shift_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (match_id) REFERENCES club_matches(id) ON DELETE CASCADE
);

-- Tabla para las asignaciones de árbitros a partidos
CREATE TABLE IF NOT EXISTS match_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id TEXT NOT NULL,
    match_id TEXT NOT NULL UNIQUE,
    assigned_referee_id TEXT NOT NULL,
    assigned_at TEXT NOT NULL,
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
    FOREIGN KEY (match_id) REFERENCES club_matches(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_referee_id) REFERENCES users(id) ON DELETE CASCADE
);
