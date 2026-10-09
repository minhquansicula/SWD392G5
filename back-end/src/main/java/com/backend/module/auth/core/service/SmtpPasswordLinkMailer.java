package com.backend.module.auth.core.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Sends password links over SMTP. Logs user ids only, never addresses or links (unless log-links is on). */
@Slf4j
@Component
public class SmtpPasswordLinkMailer implements PasswordLinkMailer {
    private static final String ENCODING = "UTF-8";

    private final JavaMailSender mailSender;
    private final String smtpUsername;
    private final String from;
    private final long linkHours;
    private final boolean logLinks;

    public SmtpPasswordLinkMailer(JavaMailSender mailSender,
                                  @Value("${spring.mail.username:}") String smtpUsername,
                                  @Value("${aives.mail.from:}") String from,
                                  @Value("${aives.mail.password-link-hours:72}") long linkHours,
                                  @Value("${aives.mail.log-links:false}") boolean logLinks) {
        this.mailSender = mailSender;
        this.smtpUsername = smtpUsername;
        this.from = from;
        this.linkHours = linkHours;
        this.logLinks = logLinks;
    }

    @Override
    public Set<UUID> send(List<PasswordLinkMail> mails) {
        Set<UUID> failed = new HashSet<>();
        if (mails.isEmpty()) return failed;
        if (smtpUsername == null || smtpUsername.isBlank()) {
            log.warn("SMTP is not configured (MAIL_USERNAME is empty); {} password link mail(s) not sent", mails.size());
            if (logLinks) mails.forEach(mail -> log.info("Password link for user {}: {}", mail.userId(), mail.link()));
            mails.forEach(mail -> failed.add(mail.userId()));
            return failed;
        }

        // Compose one by one: an address the mail library cannot parse must fail alone, not the whole batch.
        Map<MimeMessage, UUID> owners = new IdentityHashMap<>();
        List<MimeMessage> messages = new ArrayList<>();
        for (PasswordLinkMail mail : mails) {
            try {
                MimeMessage message = compose(mail);
                owners.put(message, mail.userId());
                messages.add(message);
            } catch (MessagingException | MailException ex) {
                log.warn("Password link mail for user {} could not be composed ({})",
                        mail.userId(), ex.getClass().getName());
                failed.add(mail.userId());
            }
        }
        if (messages.isEmpty()) return failed;

        try {
            // One SMTP connection for the whole batch.
            mailSender.send(messages.toArray(MimeMessage[]::new));
        } catch (MailSendException ex) {
            Set<Object> rejected = ex.getFailedMessages().keySet();
            if (rejected.isEmpty()) {
                failed.addAll(owners.values());
            } else {
                rejected.forEach(message -> {
                    UUID owner = owners.get(message);
                    if (owner != null) failed.add(owner);
                });
            }
            log.error("Password link mail failed for {} of {} recipient(s) ({})",
                    failed.size(), mails.size(), ex.getClass().getName());
        } catch (MailException ex) {
            // Authentication or another failure before any message was accepted.
            failed.addAll(owners.values());
            log.error("Password link mail failed for all {} recipient(s) ({})", mails.size(), ex.getClass().getName());
        }
        return failed;
    }

    private MimeMessage compose(PasswordLinkMail mail) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, false, ENCODING);
        if (from != null && !from.isBlank()) helper.setFrom(from);
        helper.setTo(mail.to());
        helper.setSubject(mail.activation()
                ? "[AIVES] Đặt mật khẩu cho tài khoản của bạn"
                : "[AIVES] Đặt lại mật khẩu");
        helper.setText(body(mail));
        return message;
    }

    private String body(PasswordLinkMail mail) {
        String intro = mail.activation()
                ? "Tài khoản AIVES của bạn đã được tạo. Email đăng nhập: " + mail.to() + "\n\n"
                        + "Vui lòng mở đường link dưới đây để đặt mật khẩu và kích hoạt tài khoản:"
                : "Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản AIVES của bạn.\n\n"
                        + "Vui lòng mở đường link dưới đây để đặt mật khẩu mới:";
        return "Xin chào " + mail.fullName() + ",\n\n" + intro + "\n\n" + mail.link() + "\n\n"
                + "Link chỉ dùng được một lần và hết hạn sau " + linkHours + " giờ.\n"
                + "Nếu bạn không yêu cầu, hãy bỏ qua email này; mật khẩu hiện tại không thay đổi.\n\n"
                + "AIVES";
    }
}
