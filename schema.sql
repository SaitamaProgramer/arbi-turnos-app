-- Users table to store both admins and referees
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'referee'))
);

-- Clubs table, each managed by one admin
CREATE TABLE IF NOT EXISTS clubs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    admin_user_id TEXT NOT NULL,
    FOREIGN KEY (admin_user_id) REFERENCES users(id)
);

-- Junction table for many-to-many relationship between users (referees) and clubs
CREATE TABLE IF NOT EXISTS user_clubs_membership (
    user_id TEXT NOT NULL,
    club_id TEXT NOT NULL,
    PRIMARY KEY (user_id, club_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

-- Specific matches/shifts defined by a club admin
CREATE TABLE IF NOT EXISTS club_matches (
    id TEXT PRIMARY KEY,
    club_id TEXT NOT NULL,
    description TEXT NOT NULL,
    match_date TEXT NOT NULL, -- Storing as TEXT in YYYY-MM-DD format for simplicity
    match_time TEXT NOT NULL, -- Storing as TEXT in HH:MM format
    location TEXT NOT NULL,
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

-- A referee's availability submission for a specific club
CREATE TABLE IF NOT EXISTS shift_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    club_id TEXT NOT NULL,
    has_car INTEGER NOT NULL, -- 0 for false, 1 for true
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed')),
    submitted_at TEXT NOT NULL, -- ISO 8601 string
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

-- Junction table for many-to-many relationship between a shift request and the matches it applies to
CREATE TABLE IF NOT EXISTS shift_request_matches (
    request_id TEXT NOT NULL,
    match_id TEXT NOT NULL,
    PRIMARY KEY (request_id, match_id),
    FOREIGN KEY (request_id) REFERENCES shift_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (match_id) REFERENCES club_matches(id) ON DELETE CASCADE
);

-- Final assignment of a referee to a specific match
CREATE TABLE IF NOT EXISTS match_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id TEXT NOT NULL,
    match_id TEXT NOT NULL UNIQUE, -- A match can only have one referee assigned
    assigned_referee_id TEXT NOT NULL,
    assigned_at TEXT NOT NULL, -- ISO 8601 string
    FOREIGN KEY (club_id) REFERENCES clubs(id),
    FOREIGN KEY (match_id) REFERENCES club_matches(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_referee_id) REFERENCES users(id)
);
