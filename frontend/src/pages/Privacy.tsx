import { PageTransition, FadeIn } from "../components/Motion";

export default function Privacy() {
  return (
    <PageTransition>
      <div className="container legal-page">
        <FadeIn>
          <h1>Privacy Policy</h1>
          <p className="legal-updated">Last updated: April 10, 2026</p>

          <h2>1. Information We Collect</h2>
          <p>We collect information you provide when creating an account (name, email), data you upload through the platform (CSV files), and database connection details you configure. We also collect usage data such as login timestamps and operation logs.</p>

          <h2>2. How We Use Your Information</h2>
          <p>Your information is used to provide and maintain the service, authenticate your identity, execute data transfer operations, generate audit logs, and improve the platform. We do not sell your personal data to third parties.</p>

          <h2>3. Data Storage & Security</h2>
          <p>Passwords are hashed using bcrypt. Database connection credentials are stored encrypted. All data transfers occur over HTTPS. Session tokens expire after 8 hours. We implement rate limiting and account lockout to prevent unauthorized access.</p>

          <h2>4. Third-Party Services</h2>
          <p>We use Google and GitHub OAuth for authentication. When you use these services, their respective privacy policies apply. If AI analysis is enabled, anonymized query metadata may be sent to OpenAI for analysis.</p>

          <h2>5. Data Retention</h2>
          <p>Account data is retained while your account is active. Audit logs are retained for 90 days. Uploaded CSV files are processed in memory and not stored on our servers after the operation completes.</p>

          <h2>6. Your Rights</h2>
          <p>You may request access to, correction of, or deletion of your personal data by contacting us. You may delete your account at any time, which will remove all associated data.</p>

          <h2>7. Cookies</h2>
          <p>We use essential cookies for authentication (session tokens). We do not use tracking or advertising cookies. See our Cookie Policy for details.</p>

          <h2>8. Contact</h2>
          <p>For privacy-related inquiries, contact us at <a href="mailto:[email]">[email]</a>.</p>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
