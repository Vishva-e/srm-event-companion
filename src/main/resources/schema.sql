CREATE TABLE IF NOT EXISTS food_counters (
    counter_number VARCHAR(8) PRIMARY KEY,
    floor VARCHAR(80) NOT NULL,
    zone VARCHAR(40) NOT NULL,
    near_gate VARCHAR(8) NOT NULL
);

CREATE TABLE IF NOT EXISTS seats (
    seat_code VARCHAR(8) PRIMARY KEY,
    row_label VARCHAR(4) NOT NULL,
    seat_number INTEGER NOT NULL CHECK (seat_number > 0),
    occupied BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (row_label, seat_number)
);

CREATE TABLE IF NOT EXISTS students (
    student_id VARCHAR(32) PRIMARY KEY,
    student_name VARCHAR(40) NOT NULL,
    seat_code VARCHAR(8) NOT NULL UNIQUE REFERENCES seats (seat_code),
    entry_gate VARCHAR(8) NOT NULL,
    counter_number VARCHAR(8) NOT NULL REFERENCES food_counters (counter_number)
);

CREATE TABLE IF NOT EXISTS menu_items (
    item_id VARCHAR(40) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NOT NULL,
    category VARCHAR(40) NOT NULL,
    diet_label VARCHAR(80) NOT NULL,
    badge VARCHAR(20) NOT NULL,
    art_style VARCHAR(40) NOT NULL,
    price_inr INTEGER NOT NULL CHECK (price_inr >= 0),
    display_order INTEGER NOT NULL
);
