import { Head, Link } from '@inertiajs/react';

const LAST_UPDATED = 'June 25, 2026';

export default function Policy() {
    return (
        <>
            <Head title="Privacy Policy - Slidezz" />
            <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
                <Link href="/" className="text-sm font-medium text-[#E8440A] hover:underline">
                    ← Back to Slidezz
                </Link>

                <h1 className="mt-6 mb-2 text-3xl font-bold text-gray-900">Privacy Policy</h1>
                <p className="mb-10 text-sm text-gray-500">Last updated: {LAST_UPDATED}</p>

                <div className="prose prose-slate max-w-none">
                    <p className="mb-8 text-gray-700">
                        This Privacy Policy explains how Slidezz ("Slidezz", "we", "us") collects, uses, and protects your
                        information when you use our AI carousel generator and related services available at slidezz.app
                        (the "Service"). By using the Service, you agree to the practices described here.
                    </p>

                    <h2 className="mb-4 text-xl font-semibold text-gray-900">1. Information We Collect</h2>
                    <p className="mb-3 text-gray-700">We collect the following categories of information:</p>
                    <ul className="mb-6 list-disc pl-6 text-gray-700">
                        <li>
                            <strong>Account information</strong> — name, email address, and password (stored hashed) when
                            you create an account.
                        </li>
                        <li>
                            <strong>Content you create</strong> — the carousels, slides, projects, text prompts, and
                            images you generate, upload, or edit in the Service.
                        </li>
                        <li>
                            <strong>Connected social accounts</strong> — when you connect Instagram, TikTok, or other
                            platforms, we receive access tokens and the account data needed to publish, schedule, and
                            retrieve post analytics on your behalf.
                        </li>
                        <li>
                            <strong>Your own AI keys (BYOK)</strong> — if you choose to provide your own AI provider API
                            keys, we store them encrypted and use them only to generate your content.
                        </li>
                        <li>
                            <strong>Billing information</strong> — subscription tier, credit balance, and transaction
                            records. Card data is handled directly by our payment processors and never stored on our
                            servers.
                        </li>
                        <li>
                            <strong>Usage and device data</strong> — log data, IP address, approximate location (to
                            determine your billing currency), browser and device information, and analytics events.
                        </li>
                    </ul>

                    <h2 className="mb-4 text-xl font-semibold text-gray-900">2. How We Use Your Information</h2>
                    <ul className="mb-6 list-disc pl-6 text-gray-700">
                        <li>Provide, operate, and improve the Service and generate your carousels.</li>
                        <li>Publish and schedule content to your connected social accounts at your request.</li>
                        <li>Process payments, manage subscriptions, and track credit usage.</li>
                        <li>Send transactional emails and important account or service updates.</li>
                        <li>Measure marketing performance and understand how the Service is used.</li>
                        <li>Detect, prevent, and address fraud, abuse, and security issues.</li>
                    </ul>

                    <h2 className="mb-4 text-xl font-semibold text-gray-900">3. AI Processing</h2>
                    <p className="mb-6 text-gray-700">
                        Generating carousels involves sending your prompts and selected content to third-party AI
                        providers. When you use Slidezz credits, processing runs through our provider accounts; when you
                        use your own API key (BYOK), processing runs through your provider account under that provider's
                        terms. We do not use your private content to train our own models.
                    </p>

                    <h2 className="mb-4 text-xl font-semibold text-gray-900">4. Third-Party Services</h2>
                    <p className="mb-3 text-gray-700">
                        We rely on trusted third parties to operate the Service. These include, among others:
                    </p>
                    <ul className="mb-6 list-disc pl-6 text-gray-700">
                        <li>Payment processors (e.g., Stripe) for billing.</li>
                        <li>AI providers for content generation.</li>
                        <li>Social platforms (Instagram, TikTok) for publishing and analytics.</li>
                        <li>Meta (Pixel and Conversions API) and other analytics tools for measurement.</li>
                        <li>Cloud hosting and infrastructure providers.</li>
                    </ul>
                    <p className="mb-6 text-gray-700">
                        Each third party processes data under its own privacy policy and terms.
                    </p>

                    <h2 className="mb-4 text-xl font-semibold text-gray-900">5. Cookies and Tracking</h2>
                    <p className="mb-6 text-gray-700">
                        We use cookies and similar technologies to keep you signed in, remember preferences, and measure
                        marketing performance, including the Meta Pixel and Conversions API. You can control cookies
                        through your browser settings, though some features may not work without them.
                    </p>

                    <h2 className="mb-4 text-xl font-semibold text-gray-900">6. Data Sharing</h2>
                    <p className="mb-6 text-gray-700">
                        We do not sell your personal data. We share information only with the service providers described
                        above, when required by law, or in connection with a business transfer such as a merger or
                        acquisition.
                    </p>

                    <h2 className="mb-4 text-xl font-semibold text-gray-900">7. Data Retention and Security</h2>
                    <p className="mb-6 text-gray-700">
                        We retain your information for as long as your account is active or as needed to provide the
                        Service and meet legal obligations. We apply reasonable technical and organizational measures to
                        protect your data, including encryption of sensitive credentials. No method of transmission or
                        storage is completely secure, and we cannot guarantee absolute security.
                    </p>

                    <h2 className="mb-4 text-xl font-semibold text-gray-900">8. Your Rights</h2>
                    <p className="mb-3 text-gray-700">
                        Depending on your location (including under the GDPR and Brazil's LGPD), you may have the right
                        to:
                    </p>
                    <ul className="mb-6 list-disc pl-6 text-gray-700">
                        <li>Access, correct, or delete your personal data.</li>
                        <li>Export your data in a portable format.</li>
                        <li>Object to or restrict certain processing.</li>
                        <li>Withdraw consent and opt out of marketing communications.</li>
                        <li>Disconnect any linked social account at any time.</li>
                    </ul>
                    <p className="mb-6 text-gray-700">
                        To exercise any of these rights, contact us at the address below.
                    </p>

                    <h2 className="mb-4 text-xl font-semibold text-gray-900">9. Children's Privacy</h2>
                    <p className="mb-6 text-gray-700">
                        The Service is not intended for anyone under 18. We do not knowingly collect personal information
                        from children. If you believe a child has provided us data, please contact us so we can remove
                        it.
                    </p>

                    <h2 className="mb-4 text-xl font-semibold text-gray-900">10. International Users</h2>
                    <p className="mb-6 text-gray-700">
                        Slidezz operates globally, including in Brazil and the United States. By using the Service, you
                        understand your information may be processed in countries other than your own.
                    </p>

                    <h2 className="mb-4 text-xl font-semibold text-gray-900">11. Changes to This Policy</h2>
                    <p className="mb-6 text-gray-700">
                        We may update this Privacy Policy from time to time. We will post the revised version on this page
                        and update the "Last updated" date above.
                    </p>

                    <h2 className="mb-4 text-xl font-semibold text-gray-900">12. Contact Us</h2>
                    <p className="mb-6 text-gray-700">
                        Questions about this Privacy Policy? Email us at{' '}
                        <a href="mailto:hello@slidezz.app" className="text-[#E8440A] hover:underline">
                            hello@slidezz.app
                        </a>
                        .
                    </p>
                </div>
            </div>
        </>
    );
}
