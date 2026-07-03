import { Head, Link } from '@inertiajs/react';

const LAST_UPDATED = 'June 25, 2026';

export default function Terms() {
    return (
        <>
            <Head title="Terms of Service - Slidezz" />
            <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
                <Link href="/" className="text-sm font-medium text-[#1A1A1A] hover:underline">
                    ← Back to Slidezz
                </Link>

                <h1 className="mt-6 mb-2 text-3xl font-bold text-gray-900">Terms of Service</h1>
                <p className="mb-10 text-sm text-gray-500">Last updated: {LAST_UPDATED}</p>

                <div className="prose prose-slate max-w-none">
                    <p className="mb-8 text-gray-700">
                        These Terms of Service ("Terms") govern your access to and use of Slidezz ("Slidezz", "we", "us"),
                        the AI carousel generator available at slidezz.app (the "Service"). By creating an account or using
                        the Service, you agree to these Terms. If you do not agree, do not use the Service.
                    </p>

                    <h2 className="mb-4 text-xl font-semibold text-gray-900">1. The Service</h2>
                    <p className="mb-6 text-gray-700">
                        Slidezz uses artificial intelligence to generate Instagram carousels — including text, layout, and
                        design — and lets you edit, schedule, and publish them to connected social accounts. We may add,
                        change, or remove features at any time.
                    </p>

                    <h2 className="mb-4 text-xl font-semibold text-gray-900">2. Eligibility and Accounts</h2>
                    <p className="mb-6 text-gray-700">
                        You must be at least 18 years old to use the Service. You agree to provide accurate information,
                        keep your credentials secure, and accept responsibility for all activity under your account.
                        Notify us immediately of any unauthorized use.
                    </p>

                    <h2 className="mb-4 text-xl font-semibold text-gray-900">3. Plans, Credits, and Payments</h2>
                    <ul className="mb-6 list-disc pl-6 text-gray-700">
                        <li>
                            Paid plans and credit packs are billed in your local currency (BRL for Brazil, USD elsewhere)
                            through our payment processors.
                        </li>
                        <li>
                            Subscriptions renew automatically at the end of each billing cycle unless cancelled before the
                            renewal date.
                        </li>
                        <li>
                            Credits are consumed when generating content and, unless stated otherwise, do not have cash
                            value and are non-refundable once used.
                        </li>
                        <li>
                            Prices may change; we will give reasonable notice of changes that affect an active
                            subscription.
                        </li>
                    </ul>

                    <h2 className="mb-4 text-xl font-semibold text-gray-900">4. Bring Your Own Key (BYOK)</h2>
                    <p className="mb-6 text-gray-700">
                        On eligible plans you may provide your own AI provider API keys. You are responsible for your
                        provider account, any usage costs it incurs, and for complying with that provider's terms. We use
                        your keys only to generate your content and store them encrypted.
                    </p>

                    <h2 className="mb-4 text-xl font-semibold text-gray-900">5. Your Content</h2>
                    <p className="mb-6 text-gray-700">
                        You retain ownership of the content you create with the Service. You grant us a limited,
                        worldwide, non-exclusive license to host, process, and display your content solely to operate and
                        provide the Service. You are responsible for ensuring you have the rights to any material you
                        upload and that your content does not infringe others' rights.
                    </p>

                    <h2 className="mb-4 text-xl font-semibold text-gray-900">6. Connected Social Accounts</h2>
                    <p className="mb-6 text-gray-700">
                        When you connect Instagram, TikTok, or other platforms, you authorize Slidezz to publish,
                        schedule, and read analytics on your behalf. Your use of those platforms remains subject to their
                        own terms and policies. You can disconnect any account at any time.
                    </p>

                    <h2 className="mb-4 text-xl font-semibold text-gray-900">7. Acceptable Use</h2>
                    <p className="mb-3 text-gray-700">You agree not to:</p>
                    <ul className="mb-6 list-disc pl-6 text-gray-700">
                        <li>Use the Service for any illegal, harmful, or fraudulent purpose.</li>
                        <li>Generate or publish content that is defamatory, hateful, deceptive, or infringing.</li>
                        <li>Share account access or resell the Service without authorization.</li>
                        <li>Attempt to disrupt, reverse engineer, or gain unauthorized access to the Service.</li>
                        <li>Abuse, overload, or circumvent usage limits, credits, or rate limits.</li>
                    </ul>

                    <h2 className="mb-4 text-xl font-semibold text-gray-900">8. AI-Generated Content Disclaimer</h2>
                    <p className="mb-6 text-gray-700">
                        AI output can be inaccurate or unexpected. You are responsible for reviewing generated content
                        before publishing it. The Service is provided "as is" without warranties of any kind, to the
                        fullest extent permitted by law.
                    </p>

                    <h2 className="mb-4 text-xl font-semibold text-gray-900">9. Limitation of Liability</h2>
                    <p className="mb-6 text-gray-700">
                        To the maximum extent permitted by law, Slidezz will not be liable for any indirect, incidental,
                        or consequential damages, or for lost profits or data. Our total liability for any claim is
                        limited to the amount you paid us in the twelve months before the claim arose.
                    </p>

                    <h2 className="mb-4 text-xl font-semibold text-gray-900">10. Termination</h2>
                    <p className="mb-6 text-gray-700">
                        You may cancel your account at any time. We may suspend or terminate access if you violate these
                        Terms or to protect the Service and its users. Provisions that by their nature should survive
                        termination will continue to apply.
                    </p>

                    <h2 className="mb-4 text-xl font-semibold text-gray-900">11. Changes to These Terms</h2>
                    <p className="mb-6 text-gray-700">
                        We may update these Terms from time to time. Material changes will be communicated through the
                        Service or by email, and the updated "Last updated" date will reflect the change. Continued use
                        after changes take effect constitutes acceptance.
                    </p>

                    <h2 className="mb-4 text-xl font-semibold text-gray-900">12. Contact</h2>
                    <p className="mb-6 text-gray-700">
                        Questions about these Terms? Email us at{' '}
                        <a href="mailto:hello@slidezz.app" className="text-[#1A1A1A] hover:underline">
                            hello@slidezz.app
                        </a>
                        .
                    </p>
                </div>
            </div>
        </>
    );
}
