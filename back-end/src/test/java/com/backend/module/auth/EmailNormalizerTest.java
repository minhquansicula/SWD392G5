package com.backend.module.auth;

import com.backend.module.auth.core.EmailNormalizer;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class EmailNormalizerTest {
    @Test
    void preservesNull() {
        assertNull(EmailNormalizer.normalize(null));
    }

    @Test
    void keepsEmptyResultsDistinctFromNull() {
        assertEquals("", EmailNormalizer.normalize(""));
        assertEquals("", EmailNormalizer.normalize(" \t\r\n "));
    }

    @Test
    void trimsJavaBoundaryCharactersAndLowercases() {
        for (int code = 0; code <= 32; code++) {
            String boundary = String.valueOf((char) code);
            assertEquals("alice@example.com", EmailNormalizer.normalize(
                    boundary + "Alice@EXAMPLE.COM" + boundary));
        }
    }

    @Test
    void preservesDotsPlusAndInternalWhitespace() {
        assertEquals("a.b+tag@example.com",
                EmailNormalizer.normalize(" A.B+Tag@EXAMPLE.COM "));
        assertEquals("a \tb@example.com",
                EmailNormalizer.normalize(" A \tB@EXAMPLE.COM "));
    }

    @Test
    void doesNotStripUnicodeBoundaryWhitespace() {
        assertEquals("\u2003alice@example.com\u2003",
                EmailNormalizer.normalize("\u2003Alice@EXAMPLE.COM\u2003"));
    }

    @Test
    void supportsUnicodeLowercaseWithoutAddingUnicodeNormalization() {
        assertEquals("i\u0307@example.com",
                EmailNormalizer.normalize("\u0130@EXAMPLE.COM"));
        assertEquals("\u00e9@example.com",
                EmailNormalizer.normalize("\u00c9@EXAMPLE.COM"));
        assertEquals("e\u0301@example.com",
                EmailNormalizer.normalize("E\u0301@EXAMPLE.COM"));
    }
}
