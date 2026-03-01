import { useEffect } from "react";
import Footer from "@/components/Footer";
import { getLegalLocale, getLegalDocuments } from "@/content/legalDocuments";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";

const PrivacyPolicy = () => {
    const { i18n } = useTranslation();
    const locale = getLegalLocale(i18n.language);
    const doc = getLegalDocuments(locale).privacy;

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-[#FFFBF7]">
            <Helmet>
                <title>{doc.title} | Bravita</title>
            </Helmet>
            <main className="max-w-4xl mx-auto px-6 py-12 md:py-20">
                <a href="/" className="inline-block mb-10 text-orange-600 hover:underline font-medium">← Ana Sayfaya Dön</a>
                <h1 className="text-3xl md:text-5xl font-black text-orange-900 mb-6">{doc.title}</h1>
                <p className="text-lg text-neutral-600 mb-12">{doc.description}</p>

                <div className="space-y-12">
                    {doc.sections.map((section, idx) => (
                        <section key={idx} className="space-y-4">
                            <h2 className="text-xl md:text-2xl font-bold text-orange-800">{section.heading}</h2>
                            <div className="space-y-3">
                                {section.paragraphs.map((p, pIdx) => (
                                    <p key={pIdx} className="text-neutral-700 leading-relaxed">{p}</p>
                                ))}
                            </div>
                            {section.items && section.items.length > 0 && (
                                <ul className="list-disc pl-6 space-y-2 text-neutral-700">
                                    {section.items.map((item, iIdx) => (
                                        <li key={iIdx}>{item}</li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    ))}
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default PrivacyPolicy;
