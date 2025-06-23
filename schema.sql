
-- Users Table: Stores user information, credentials, and role.
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'referee'))
);

-- Clubs Table: Stores club information and the admin who owns it.
CREATE TABLE IF NOT EXISTS clubs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  admin_user_id TEXT NOT NULL,
  FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User-Clubs Membership Table: A many-to-many relationship linking referees to clubs.
CREATE TABLE IF NOT EXISTS user_clubs_membership (
  user_id TEXT NOT NULL,
  club_id TEXT NOT NULL,
  PRIMARY KEY (user_id, club_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

-- Club Matches Table: Stores specific matches/shifts defined by a club admin.
CREATE TABLE IF NOT EXISTS club_matches (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL,
  description TEXT NOT NULL,
  match_date TEXT NOT NULL, -- Stored as ISO 8601 string "YYYY-MM-DD"
  match_time TEXT NOT NULL, -- Stored as "HH:MM"
  location TEXT NOT NULL,
  FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

-- Shift Requests Table: A referee's overall postulation for a specific club.
CREATE TABLE IF NOT EXISTS shift_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  club_id TEXT NOT NULL,
  has_car INTEGER NOT NULL, -- Using INTEGER for boolean (0 for false, 1 for true)
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed')),
  submitted_at TEXT NOT NULL, -- Stored as ISO 8601 string
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

-- Shift Request Matches Table: Links a shift request to the specific matches the referee selected.
CREATE TABLE IF NOT EXISTS shift_request_matches (
  request_id TEXT NOT NULL,
  match_id TEXT NOT NULL,
  PRIMARY KEY (request_id, match_id),
  FOREIGN KEY (request_id) REFERENCES shift_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (match_id) REFERENCES club_matches(id) ON DELETE CASCADE
);

-- Match Assignments Table: Final assignment of a referee to a specific match.
CREATE TABLE IF NOT EXISTS match_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  club_id TEXT NOT NULL,
  match_id TEXT NOT NULL UNIQUE, -- A match can only be assigned to one referee
  assigned_referee_id TEXT NOT NULL,
  assigned_at TEXT NOT NULL, -- Stored as ISO 8601 string
  FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
  FOREIGN KEY (match_id) REFERENCES club_matches(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_referee_id) REFERENCES users(id) ON DELETE CASCADE
);
