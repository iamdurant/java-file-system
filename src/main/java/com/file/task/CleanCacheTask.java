package com.file.task;

import org.jetbrains.annotations.NotNull;

import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;

public class CleanCacheTask {
    private static final CopyOnWriteArrayList<Task> tasks = new CopyOnWriteArrayList<>();

    public static void addTask(Long userId, Long time, String fileName) {
        tasks.add(new Task(userId, time, fileName));
    }

    @NotNull
    public static List<Task> sortAndGetCanCleanFile() {
        tasks.sort(Comparator.comparingLong(n -> n.time));
        List<Task> result = new ArrayList<>();
        for (Task cur : tasks) {
            if (cur.time > new Date().getTime()) break;
            result.add(cur);
        }
        return result;
    }

    public static void removeFile(Long userId, String name) {
        tasks.removeIf(n -> n.fileName.equals(name) && (long) userId == n.userId);
    }

    public static class Task {
        Long userId;
        Long time;

        String fileName;

        public Task(Long userId, Long time, String fileName) {
            this.userId = userId;
            this.time = time;
            this.fileName = fileName;
        }
    }
}
