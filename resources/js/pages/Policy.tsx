import { Head } from '@inertiajs/react';

export default function Policy() {
    return (
        <>
            <Head title="Privacy Policy - CleverNote" />
            <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
                
                <div className="prose prose-slate max-w-none">
                    <h2 className="text-xl font-semibold mb-4">1. Information We Collect</h2>
                    <p className="mb-6">
                        We collect information that you provide directly to us when using CleverNote, including:
                        <ul className="list-disc pl-6 mb-6">
                            <li>Account information (name, email, password)</li>
                            <li>User-generated content (notes, flashcards, quizzes)</li>
                            <li>Usage data and analytics</li>
                            <li>Device information</li>
                        </ul>
                    </p>

                    <h2 className="text-xl font-semibold mb-4">2. How We Use Your Information</h2>
                    <p className="mb-6">
                        We use the collected information to:
                        <ul className="list-disc pl-6 mb-6">
                            <li>Provide and improve our services</li>
                            <li>Personalize your experience</li>
                            <li>Send important updates and notifications</li>
                            <li>Analyze usage patterns and optimize performance</li>
                        </ul>
                    </p>

                    <h2 className="text-xl font-semibold mb-4">3. Data Security</h2>
                    <p className="mb-6">
                        We implement appropriate security measures to protect your personal information from unauthorized access, alteration, or disclosure.
                    </p>

                    <h2 className="text-xl font-semibold mb-4">4. Third-Party Services</h2>
                    <p className="mb-6">
                        Our app integrates with third-party services for enhanced functionality. These services have their own privacy policies and terms of use.
                    </p>

                    <h2 className="text-xl font-semibold mb-4">5. Your Rights</h2>
                    <p className="mb-6">
                        You have the right to:
                        <ul className="list-disc pl-6 mb-6">
                            <li>Access your personal data</li>
                            <li>Request data correction or deletion</li>
                            <li>Opt-out of marketing communications</li>
                            <li>Export your data</li>
                        </ul>
                    </p>

                    <h2 className="text-xl font-semibold mb-4">6. Children's Privacy</h2>
                    <p className="mb-6">
                        Our service is not intended for children under 13. We do not knowingly collect personal information from children under 13.
                    </p>

                    <h2 className="text-xl font-semibold mb-4">7. Changes to This Policy</h2>
                    <p className="mb-6">
                        We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page.
                    </p>

                    <p>Last updated: {new Date().toLocaleDateString()}</p>
                </div>
            </div>
        </>
    );
}