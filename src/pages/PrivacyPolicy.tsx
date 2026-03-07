import { useEffect } from "react";
import Footer from "@/components/Footer";
import { getLegalLocale, getLegalDocuments } from "@/content/legalDocuments";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";

const PrivacyPolicy = () => {
    const { i18n, t } = useTranslation();
    const locale = getLegalLocale(i18n.language);
    const doc = getLegalDocuments(locale).privacy;
    const siteUrl = "https://bravita.com.tr";
    const canonicalUrl = `${siteUrl}/gizlilik-politikasi`;
    const pageTitle = `${doc.title} | Bravita`;
    const pageLocale = locale === "tr" ? "tr_TR" : "en_US";
    const pageLanguage = locale === "tr" ? "tr-TR" : "en-US";
    const skipToContentLabel = t("accessibility.skip_to_content", "Ana içeriğe geç");
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: doc.title,
        description: doc.description,
        url: canonicalUrl,
        inLanguage: pageLanguage,
        isPartOf: {
            "@type": "WebSite",
            name: "Bravita",
            url: siteUrl,
        },
    };

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-[#FFFBF7]">
            <Helmet>
                <title>{pageTitle}</title>
                <meta name="description" content={doc.description} />
                <meta name="robots" content="index,follow" />
                <link rel="canonical" href={canonicalUrl} />
                <meta property="og:title" content={pageTitle} />
                <meta property="og:description" content={doc.description} />
                <meta property="og:type" content="article" />
                <meta property="og:url" content={canonicalUrl} />
                <meta property="og:image" content={`${siteUrl}/og-image.webp`} />
                <meta property="og:image:alt" content={`${doc.title} | Bravita`} />
                <meta property="og:site_name" content="Bravita" />
                <meta property="og:locale" content={pageLocale} />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:site" content="@Bravita" />
                <meta name="twitter:title" content={pageTitle} />
                <meta name="twitter:description" content={doc.description} />
                <meta name="twitter:image" content={`${siteUrl}/og-image.webp`} />
                <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
            </Helmet>
            <a
                href="#main-content"
                className="sr-only fixed left-4 top-4 z-100 rounded-full bg-orange-500 px-4 py-3 font-bold text-white shadow-lg focus:not-sr-only"
            >
                {skipToContentLabel}
            </a>
            <main id="main-content" className="max-w-4xl mx-auto px-6 py-12 md:py-20">
                <a href="/" className="inline-block mb-10 text-orange-600 hover:underline font-medium">← Ana Sayfaya Dön</a>
                <h1 className="text-3xl md:text-5xl font-black text-orange-900 mb-6">{doc.title}</h1>
                <p className="text-lg text-neutral-600 mb-12">{doc.description}</p>

                <div className="space-y-12">
                    {doc.sections.map((section) => (
                        <section key={section.heading} className="space-y-4">
                            <h2 className="text-xl md:text-2xl font-bold text-orange-800">{section.heading}</h2>
                            <div className="space-y-3">
                                {section.paragraphs.map((paragraph) => (
                                    <p key={`${section.heading}-${paragraph.slice(0, 48)}`} className="text-neutral-700 leading-relaxed">{paragraph}</p>
                                ))}
                            </div>
                            {section.items && section.items.length > 0 && (
                                <ul className="list-disc pl-6 space-y-2 text-neutral-700">
                                    {section.items.map((item) => (
                                        <li key={`${section.heading}-${item}`}>{item}</li>
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
