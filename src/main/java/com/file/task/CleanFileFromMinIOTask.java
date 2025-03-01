package com.file.task;

import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;

public class CleanFileFromMinIOTask {
    private static final CopyOnWriteArrayList<Task> tasks = new CopyOnWriteArrayList<>();

    public static void addTask(String bucketRealName, String path, String name) {
        Calendar calendar = Calendar.getInstance();
        calendar.add(Calendar.MINUTE, 1);
        long time = calendar.getTime().getTime();
        tasks.add(new Task(time, bucketRealName, path, name));
    }

    public static List<Task> getCanConsume() {
        tasks.sort(Comparator.comparingLong(n -> n.time));
        long now = new Date().getTime();
        List<Task> result = new ArrayList<>();
        for (Task task : tasks) {
            if(task.time > now) break;
            result.add(task);
        }

        return result;
    }

    public static void remove(Task t) {
        tasks.removeIf(n -> n.bucketRealName.equals(t.bucketRealName)
        && n.path.equals(t.path)
        && n.name.equals(t.name));
    }

    public static class Task {
        Long time;
        String bucketRealName;
        String path;
        String name;

        public Task(Long time, String bucketRealName, String path, String name) {
            this.time = time;
            this.bucketRealName = bucketRealName;
            this.path = path;
            this.name = name;
        }
    }
}
