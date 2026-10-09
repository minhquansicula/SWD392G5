package com.backend.module.auth;

import com.backend.module.auth.core.service.PasswordLinkMail;
import com.backend.module.auth.core.service.SmtpPasswordLinkMailer;
import jakarta.mail.Message;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Predicate;

import static org.junit.jupiter.api.Assertions.*;

/** Real message composition (Jakarta Mail); only the network hand-off is replaced. */
class SmtpPasswordLinkMailerTest {

    /** Captures what would go on the wire and fails the recipients a test selects. */
    private static final class RecordingSender extends JavaMailSenderImpl {
        final List<MimeMessage> handedOver = new ArrayList<>();
        Predicate<String> rejects = recipient -> false;
        RuntimeException connectionFailure;

        @Override
        protected void doSend(MimeMessage[] mimeMessages, Object[] originalMessages) {
            if (connectionFailure != null) throw connectionFailure;
            Map<Object, Exception> failed = new LinkedHashMap<>();
            for (MimeMessage message : mimeMessages) {
                handedOver.add(message);
                if (rejects.test(recipient(message))) failed.put(message, new IllegalStateException("rejected"));
            }
            if (!failed.isEmpty()) throw new MailSendException(failed);
        }
    }

    private final RecordingSender sender = new RecordingSender();

    private SmtpPasswordLinkMailer mailer(String smtpUsername) {
        return new SmtpPasswordLinkMailer(sender, smtpUsername, "noreply@example.com", 72, false);
    }

    private static PasswordLinkMail mail(String to, boolean activation) {
        return new PasswordLinkMail(UUID.randomUUID(), to, "Nguyễn Văn Minh",
                "http://localhost:5173/#/set-password?token=raw-token", activation);
    }

    private static String recipient(MimeMessage message) {
        try {
            return message.getRecipients(Message.RecipientType.TO)[0].toString();
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }

    @Test
    void composesOneUtf8MessagePerRecipientWithTheLink() throws Exception {
        PasswordLinkMail activation = mail("sv01@fpt.edu.vn", true);
        PasswordLinkMail reset = mail("gv01@fpt.edu.vn", false);

        assertTrue(mailer("sender@gmail.com").send(List.of(activation, reset)).isEmpty());

        assertEquals(2, sender.handedOver.size());
        MimeMessage first = sender.handedOver.get(0);
        assertEquals("sv01@fpt.edu.vn", recipient(first));
        assertEquals("noreply@example.com", first.getFrom()[0].toString());
        assertEquals("[AIVES] Đặt mật khẩu cho tài khoản của bạn", first.getSubject());
        String body = (String) first.getContent();
        assertTrue(body.contains("Xin chào Nguyễn Văn Minh"));
        assertTrue(body.contains(activation.link()));
        assertTrue(body.contains("72 giờ"));
        assertEquals("[AIVES] Đặt lại mật khẩu", sender.handedOver.get(1).getSubject());
    }

    @Test
    void anAddressTheMailLibraryCannotParseFailsAloneAndTheRestAreStillSent() {
        // Passes the application's email validation, but Jakarta Mail refuses the underscore in the domain.
        PasswordLinkMail unparseable = mail("sv02@fpt_edu.vn", true);
        PasswordLinkMail before = mail("sv01@fpt.edu.vn", true);
        PasswordLinkMail after = mail("sv03@fpt.edu.vn", true);

        Set<UUID> failed = mailer("sender@gmail.com").send(List.of(before, unparseable, after));

        assertEquals(Set.of(unparseable.userId()), failed);
        assertEquals(List.of("sv01@fpt.edu.vn", "sv03@fpt.edu.vn"),
                sender.handedOver.stream().map(SmtpPasswordLinkMailerTest::recipient).toList());
    }

    @Test
    void recipientsRejectedByTheServerAreReportedIndividually() {
        PasswordLinkMail accepted = mail("sv01@fpt.edu.vn", true);
        PasswordLinkMail rejected = mail("sv02@fpt.edu.vn", true);
        sender.rejects = "sv02@fpt.edu.vn"::equals;

        assertEquals(Set.of(rejected.userId()), mailer("sender@gmail.com").send(List.of(accepted, rejected)));
    }

    @Test
    void aFailureBeforeAnyMessageIsAcceptedFailsEveryRecipient() {
        PasswordLinkMail first = mail("sv01@fpt.edu.vn", true);
        PasswordLinkMail second = mail("sv02@fpt.edu.vn", false);
        for (RuntimeException failure : List.of(new MailAuthenticationException("bad app password"),
                new MailSendException("connection refused"))) {
            sender.connectionFailure = failure;
            assertEquals(Set.of(first.userId(), second.userId()),
                    mailer("sender@gmail.com").send(List.of(first, second)));
        }
    }

    @Test
    void withoutSmtpCredentialsNothingIsHandedOverAndEveryoneIsReportedFailed() {
        PasswordLinkMail mail = mail("sv01@fpt.edu.vn", true);
        for (String missing : new String[] {"", "  ", null}) {
            assertEquals(Set.of(mail.userId()), mailer(missing).send(List.of(mail)));
        }
        assertTrue(mailer("sender@gmail.com").send(List.of()).isEmpty());
        assertTrue(sender.handedOver.isEmpty());
    }
}
