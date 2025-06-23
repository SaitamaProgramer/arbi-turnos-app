
-- Users Table: Stores user information, including credentials and role.
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL, -- Stores hashed password
    role TEXT NOT NULL CHECK(role IN ('admin', 'referee'))
);

-- Clubs Table: Stores information about each club.
CREATE TABLE IF NOT EXISTS clubs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    admin_user_id TEXT NOT NULL,
    FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User_Clubs_Membership Table: A join table for the many-to-many relationship between users (referees) and clubs.
CREATE TABLE IF NOT EXISTS user_clubs_membership (
    user_id TEXT NOT NULL,
    club_id TEXT NOT NULL,
    PRIMARY KEY (user_id, club_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

-- Club_Matches Table: Defines specific matches/shifts available for a club.
CREATE TABLE IF NOT EXISTS club_matches (
    id TEXT PRIMARY KEY,
    club_id TEXT NOT NULL,
    description TEXT NOT NULL,
    date TEXT NOT NULL, -- ISO Date string 'YYYY-MM-DD'
    time TEXT NOT NULL, -- Time string 'HH:MM'
    location TEXT NOT NULL,
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

-- Shift_Requests Table: Stores a referee's application for shifts within a club.
CREATE TABLE IF NOT EXISTS shift_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    club_id TEXT NOT NULL,
    has_car BOOLEAN NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed')),
    submitted_at TEXT NOT NULL, -- ISO DateTime string
    UNIQUE(user_id, club_id, status), -- A user can only have one pending request per club
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

-- Shift_Request_Matches Table: A join table for the many-to-many relationship between a shift request and the matches it applies to.
CREATE TABLE IF NOT EXISTS shift_request_matches (
    request_id TEXT NOT NULL,
    match_id TEXT NOT NULL,
    PRIMARY KEY (request_id, match_id),
    FOREIGN KEY (request_id) REFERENCES shift_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (match_id) REFERENCES club_matches(id) ON DELETE CASCADE
);


-- Match_Assignments Table: Stores the final assignment of a referee to a specific match.
CREATE TABLE IF NOT EXISTS match_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id TEXT NOT NULL,
    match_id TEXT NOT NULL UNIQUE, -- A match can only have one assignment
    assigned_referee_id TEXT NOT NULL,
    assigned_at TEXT NOT NULL, -- ISO DateTime string
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
    FOREIGN KEY (match_id) REFERENCES club_matches(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_referee_id) REFERENCES users(id) ON DELETE CASCADE
);
