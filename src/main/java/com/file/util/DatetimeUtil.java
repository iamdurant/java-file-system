package com.file.util;

import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

public class DatetimeUtil {
    public static String format(ZonedDateTime zdt) {
        return zdt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }
}
