-- Insert missing demo fixtures only. Existing data is preserved on restart.
INSERT INTO food_counters (counter_number, floor, zone, near_gate)
SELECT seed.counter_number, seed.floor, seed.zone, seed.near_gate
FROM (VALUES
    ('01', 'Ground Floor', 'Zone A', '01'),
    ('02', 'First Floor', 'Zone C', '03'),
    ('03', 'Ground Floor', 'Zone B', '02')
) AS seed(counter_number, floor, zone, near_gate)
WHERE NOT EXISTS (SELECT 1 FROM food_counters existing WHERE existing.counter_number = seed.counter_number);

-- The auditorium has seven rows and nine seats per row. Student assignments
-- also mark seats occupied when queried; those assignments are not duplicated here.
INSERT INTO seats (seat_code, row_label, seat_number, occupied)
SELECT CONCAT(seat_rows.row_label, '0', seat_numbers.seat_number),
       seat_rows.row_label, seat_numbers.seat_number,
       CONCAT(seat_rows.row_label, '0', seat_numbers.seat_number) IN
           ('A02', 'A08', 'B06', 'B07', 'C01', 'C03', 'D05', 'D08', 'E01', 'F04', 'F09', 'G02', 'G06')
FROM (VALUES ('A'), ('B'), ('C'), ('D'), ('E'), ('F'), ('G')) AS seat_rows(row_label)
CROSS JOIN (VALUES (1), (2), (3), (4), (5), (6), (7), (8), (9)) AS seat_numbers(seat_number)
WHERE NOT EXISTS (
    SELECT 1 FROM seats existing
    WHERE existing.seat_code = CONCAT(seat_rows.row_label, '0', seat_numbers.seat_number)
       OR (existing.row_label = seat_rows.row_label AND existing.seat_number = seat_numbers.seat_number)
);

INSERT INTO students (student_id, student_name, seat_code, entry_gate, counter_number)
SELECT seed.student_id, seed.student_name, seed.seat_code, seed.entry_gate, seed.counter_number
FROM (VALUES
    ('SRM2026001', 'Vishva', 'E07', '02', '03'),
    ('SRM2026002', 'Sanjana', 'C04', '01', '01'),
    ('SRM2026003', 'Arun', 'F02', '03', '02')
) AS seed(student_id, student_name, seat_code, entry_gate, counter_number)
WHERE NOT EXISTS (
    SELECT 1 FROM students existing
    WHERE existing.student_id = seed.student_id OR existing.seat_code = seed.seat_code
)
AND EXISTS (SELECT 1 FROM seats seat WHERE seat.seat_code = seed.seat_code)
AND EXISTS (SELECT 1 FROM food_counters counter WHERE counter.counter_number = seed.counter_number);

INSERT INTO menu_items (item_id, name, description, category, diet_label, badge, art_style, price_inr, display_order)
SELECT seed.item_id, seed.name, seed.description, seed.category, seed.diet_label,
       seed.badge, seed.art_style, seed.price_inr, seed.display_order
FROM (VALUES
    ('veg-meals', 'Veg meals', 'Rice, sambar & traditional sides', 'meals', 'VEGETARIAN · MEALS', 'VEG', 'veg', 120, 1),
    ('chicken-rice', 'Chicken rice', 'Spiced rice & chicken', 'meals', 'NON-VEGETARIAN · MEALS', 'NON-VEG', 'nonveg', 150, 2),
    ('paneer-wrap', 'Paneer wrap', 'Fresh grilled wrap', 'snacks', 'VEGETARIAN · SNACKS', 'SNACK', 'snack', 90, 3),
    ('lime-juice', 'Fresh lime juice', 'Chilled refreshment', 'drinks', 'COLD BEVERAGE · DRINKS', 'DRINK', 'drink', 50, 4)
) AS seed(item_id, name, description, category, diet_label, badge, art_style, price_inr, display_order)
WHERE NOT EXISTS (SELECT 1 FROM menu_items existing WHERE existing.item_id = seed.item_id);
