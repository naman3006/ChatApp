import nodemailer from "nodemailer";

export const sendResetEmail = async (to, resetUrl) => {
    try {
        let user = process.env.ETHEREAL_EMAIL;
        let pass = process.env.ETHEREAL_PASSWORD;

        if (!user || !pass) {
            // Generate test SMTP service account from ethereal.email
            // Only needed if you don't have a real mail account for testing
            const testAccount = await nodemailer.createTestAccount();
            user = testAccount.user;
            pass = testAccount.pass;
        }

        const transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: user,
                pass: pass,
            },
        });

        const info = await transporter.sendMail({
            from: '"Chat App" <noreply@chatapp.com>',
            to: to,
            subject: "Password Reset Request",
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Reset Your Password</h2>
          <p>You requested a password reset. Click the button below to reset your password:</p>
          <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
          <p>If you didn't request this, please ignore this email.</p>
          <p>Link expires in 15 minutes.</p>
        </div>
      `,
        });

        console.log("Message sent: %s", info.messageId);
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));

        return info;
    } catch (error) {
        console.error("Error sending email:", error.message);
        throw new Error(`Failed to send email: ${error.message}`);
    }
};
