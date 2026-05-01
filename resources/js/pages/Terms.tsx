import { Head } from '@inertiajs/react';

export default function Terms() {
    return (
        <>
            <Head title="Terms of Service - CleverNote" />
            <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
                
                <div className="prose prose-slate max-w-none">
                    <h2 className="text-xl font-semibold mb-4">1. Acceptance of Terms</h2>
                    <p className="mb-6">
                        By downloading, installing, or using CleverNote, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the application.
                    </p>

                    <h2 className="text-xl font-semibold mb-4">2. Description of Service</h2>
                    <p className="mb-6">
                        CleverNote is a study assistance application that provides note-taking, flashcard creation, quiz generation, and mind mapping features to help users learn and retain information more effectively.
                    </p>

                    <h2 className="text-xl font-semibold mb-4">3. User Accounts</h2>
                    <p className="mb-6">
                        You must provide accurate and complete information when creating an account. You are responsible for maintaining the security of your account and for all activities that occur under your account.
                    </p>

                    <h2 className="text-xl font-semibold mb-4">4. Privacy Policy</h2>
                    <p className="mb-6">
                        Your use of CleverNote is also governed by our Privacy Policy, which can be found on our website. By using CleverNote, you consent to the collection and use of information as detailed in the Privacy Policy.
                    </p>

                    <h2 className="text-xl font-semibold mb-4">5. User Content</h2>
                    <p className="mb-6">
                        You retain all rights to any content you submit, post, or display through CleverNote. By submitting content, you grant CleverNote a worldwide, non-exclusive license to use, copy, modify, and distribute your content.
                    </p>

                    <h2 className="text-xl font-semibold mb-4">6. Subscription and Payments</h2>
                    <p className="mb-6">
                        Some features of CleverNote require a paid subscription. Payments are processed through secure third-party payment processors. Subscriptions automatically renew unless cancelled before the renewal date.
                    </p>

                    <h2 className="text-xl font-semibold mb-4">7. Prohibited Activities</h2>
                    <p className="mb-6">
                        Users may not:
                        <ul className="list-disc pl-6 mt-2">
                            <li>Use the service for any illegal purpose</li>
                            <li>Share account credentials</li>
                            <li>Upload malicious content</li>
                            <li>Attempt to gain unauthorized access to the service</li>
                            <li>Interfere with other users' use of the service</li>
                        </ul>
                    </p>

                    <h2 className="text-xl font-semibold mb-4">8. Termination</h2>
                    <p className="mb-6">
                        We reserve the right to terminate or suspend access to our service immediately, without prior notice, for any violation of these Terms.
                    </p>

                    <h2 className="text-xl font-semibold mb-4">9. Changes to Terms</h2>
                    <p className="mb-6">
                        We may modify these terms at any time. We will notify users of any material changes via email or through the application.
                    </p>

                    <h2 className="text-xl font-semibold mb-4">10. Contact Information</h2>
                    <p className="mb-6">
                        For questions about these Terms, please contact us through our support channels available in the application.
                    </p>

                    <div className="mt-8 text-sm text-gray-500">
                        <p>Last updated: {new Date().toLocaleDateString()}</p>
                    </div>
                </div>
            </div>
        </>
    );
}