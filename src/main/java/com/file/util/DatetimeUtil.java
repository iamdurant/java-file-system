package com.file.util;

import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

public class DatetimeUtil {
    private static final String timeFormatPattern = "yyyy-MM-dd HH:mm:ss";

    public static String format(ZonedDateTime zdt) {
        return zdt.format(DateTimeFormatter.ofPattern(timeFormatPattern));
    }

    public static String format(LocalDateTime dateTime) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern(timeFormatPattern);
        return dateTime.format(formatter);
    }
}
