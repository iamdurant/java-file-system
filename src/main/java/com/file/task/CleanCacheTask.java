package com.file.task;

import org.jetbrains.annotations.NotNull;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

public class CleanCacheTask {
    private static final CopyOnWriteArrayList<Task> tasks = new CopyOnWriteArrayList<>();

    public static void addTask(Long time, String fileName) {
        tasks.add(new Task(time, fileName));
    }

    @NotNull
    public static List<String> sortAndGetCanCleanFile() {
        tasks.sort(Comparator.comparingLong(n -> n.time));
        List<String> result = new ArrayList<>();
        for (Task cur : tasks) {
            if (cur.time > new Date().getTime()) break;
            result.add(cur.fileName);
        }
        return result;
    }

    static class Task {
        Long time;

        String fileName;

        public Task(Long time, String fileName) {
            this.time = time;
            this.fileName = fileName;
        }
    }
}
