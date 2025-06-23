-- SQL Schema for the Arbitros Turnos Application
-- This schema translates the localStorage object structure into a relational database model.

-- -----------------------------------------------------
-- Table `Clubs`
-- Stores information about each club.
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `Clubs` (
  `id` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `admin_user_id` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `admin_user_id_UNIQUE` (`admin_user_id` ASC)
) ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `Users`
-- Stores user accounts, both for referees and administrators.
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `Users` (
  `id` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'referee') NOT NULL,
  `administered_club_id` VARCHAR(255) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `email_UNIQUE` (`email` ASC),
  INDEX `fk_Users_Clubs1_idx` (`administered_club_id` ASC),
  CONSTRAINT `fk_Users_Clubs1`
    FOREIGN KEY (`administered_club_id`)
    REFERENCES `Clubs` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE = InnoDB;

-- We can now set the foreign key from Clubs to Users, as both tables exist.
ALTER TABLE `Clubs` 
ADD INDEX `fk_Clubs_Users1_idx` (`admin_user_id` ASC);
ALTER TABLE `Clubs` 
ADD CONSTRAINT `fk_Clubs_Users1`
  FOREIGN KEY (`admin_user_id`)
  REFERENCES `Users` (`id`)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;


-- -----------------------------------------------------
-- Table `UserClubMemberships`
-- Junction table for the many-to-many relationship between Users (referees) and Clubs.
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `UserClubMemberships` (
  `user_id` VARCHAR(255) NOT NULL,
  `club_id` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`user_id`, `club_id`),
  INDEX `fk_Users_has_Clubs_Clubs1_idx` (`club_id` ASC),
  INDEX `fk_Users_has_Clubs_Users_idx` (`user_id` ASC),
  CONSTRAINT `fk_Users_has_Clubs_Users`
    FOREIGN KEY (`user_id`)
    REFERENCES `Users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_Users_has_Clubs_Clubs1`
    FOREIGN KEY (`club_id`)
    REFERENCES `Clubs` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `ClubSpecificMatches`
-- Stores the specific matches/shifts defined by a club administrator.
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `ClubSpecificMatches` (
  `id` VARCHAR(255) NOT NULL,
  `club_id` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `match_date` DATE NOT NULL,
  `match_time` TIME NOT NULL,
  `location` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `fk_ClubSpecificMatches_Clubs1_idx` (`club_id` ASC),
  CONSTRAINT `fk_ClubSpecificMatches_Clubs1`
    FOREIGN KEY (`club_id`)
    REFERENCES `Clubs` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `ShiftRequests`
-- Stores a referee's postulation (availability submission).
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `ShiftRequests` (
  `id` VARCHAR(255) NOT NULL,
  `user_id` VARCHAR(255) NOT NULL,
  `club_id` VARCHAR(255) NOT NULL,
  `has_car` TINYINT NOT NULL,
  `notes` TEXT NULL,
  `status` ENUM('pending', 'completed') NOT NULL DEFAULT 'pending',
  `submitted_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `fk_ShiftRequests_Users1_idx` (`user_id` ASC),
  INDEX `fk_ShiftRequests_Clubs1_idx` (`club_id` ASC),
  CONSTRAINT `fk_ShiftRequests_Users1`
    FOREIGN KEY (`user_id`)
    REFERENCES `Users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_ShiftRequests_Clubs1`
    FOREIGN KEY (`club_id`)
    REFERENCES `Clubs` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `ShiftRequestMatches`
-- Junction table for the many-to-many relationship between a ShiftRequest and the specific matches a referee applied for.
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `ShiftRequestMatches` (
  `shift_request_id` VARCHAR(255) NOT NULL,
  `match_id` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`shift_request_id`, `match_id`),
  INDEX `fk_ShiftRequests_has_ClubSpecificMatches_ClubSpecificMatches_idx` (`match_id` ASC),
  INDEX `fk_ShiftRequests_has_ClubSpecificMatches_ShiftRequests1_idx` (`shift_request_id` ASC),
  CONSTRAINT `fk_ShiftRequests_has_ClubSpecificMatches_ShiftRequests1`
    FOREIGN KEY (`shift_request_id`)
    REFERENCES `ShiftRequests` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_ShiftRequests_has_ClubSpecificMatches_ClubSpecificMatches1`
    FOREIGN KEY (`match_id`)
    REFERENCES `ClubSpecificMatches` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `MatchAssignments`
-- Stores the definitive assignment of a referee to a specific match.
-- A match can only have one referee assigned in this model, so match_id is the PRIMARY KEY.
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `MatchAssignments` (
  `match_id` VARCHAR(255) NOT NULL,
  `assigned_referee_id` VARCHAR(255) NOT NULL,
  `club_id` VARCHAR(255) NOT NULL COMMENT 'Included for easier querying, though redundant if match_id is a FK.',
  `assigned_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`match_id`),
  INDEX `fk_MatchAssignments_Users1_idx` (`assigned_referee_id` ASC),
  INDEX `fk_MatchAssignments_Clubs1_idx` (`club_id` ASC),
  CONSTRAINT `fk_MatchAssignments_ClubSpecificMatches1`
    FOREIGN KEY (`match_id`)
    REFERENCES `ClubSpecificMatches` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_MatchAssignments_Users1`
    FOREIGN KEY (`assigned_referee_id`)
    REFERENCES `Users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_MatchAssignments_Clubs1`
    FOREIGN KEY (`club_id`)
    REFERENCES `Clubs` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB;

