package com.file.util;

import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

import java.util.Random;

@RequiredArgsConstructor
@Component
public class MailUtil {
    private final String from = "iamkevinkd@gmail.com";

    private final String head = "验证码: ";

    private final String tail = "，有效期60秒";

    private final JavaMailSender sender;

    @SneakyThrows
    public void sendCode(String subject, String code, String mailAddrOfUser) {
        SimpleMailMessage message = new SimpleMailMessage();

        message.setFrom(from);
        message.setTo(mailAddrOfUser);
        message.setSubject(subject);
        message.setText(head + code + tail);

        sender.send(message);
    }

    public String generateCode() {
        StringBuilder sb = new StringBuilder();
        Random random = new Random();
        for(int i = 0;i < 6;i++) {
            sb.append(random.nextInt(10));
        }
        return sb.toString();
    }
}
