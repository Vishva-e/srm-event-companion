package com.srm.eventcompanion;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.support.EncodedResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class EventDatabasePersistenceTest {
    @TempDir Path directory;

    @Test
    void fileDatabaseRetainsEditsWhenReopenedAndInitializedAgain() throws Exception {
        String url = "jdbc:h2:file:" + directory.resolve("event-db").toAbsolutePath();
        try (Connection connection = DriverManager.getConnection(url)) {
            initialize(connection);
            try (var statement = connection.createStatement()) {
                assertEquals(1, statement.executeUpdate(
                        "UPDATE menu_items SET price_inr = 175 WHERE item_id = 'veg-meals'"));
            }
        }

        try (Connection connection = DriverManager.getConnection(url)) {
            initialize(connection);
            try (var statement = connection.createStatement();
                 var result = statement.executeQuery("""
                         SELECT price_inr,
                                (SELECT COUNT(*) FROM students) AS student_count,
                                (SELECT COUNT(*) FROM seats) AS seat_count,
                                (SELECT COUNT(*) FROM food_counters) AS counter_count,
                                (SELECT COUNT(*) FROM menu_items) AS menu_count
                         FROM menu_items WHERE item_id = 'veg-meals'
                         """)) {
                assertTrue(result.next());
                assertEquals(175, result.getInt("price_inr"));
                assertEquals(3, result.getInt("student_count"));
                assertEquals(63, result.getInt("seat_count"));
                assertEquals(3, result.getInt("counter_count"));
                assertEquals(4, result.getInt("menu_count"));
            }
        }
    }

    private void initialize(Connection connection) {
        for (String script : new String[]{"schema.sql", "data.sql"}) {
            ScriptUtils.executeSqlScript(connection,
                    new EncodedResource(new ClassPathResource(script), StandardCharsets.UTF_8));
        }
    }
}
