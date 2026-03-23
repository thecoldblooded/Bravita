import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import ScrollReveal from "@/components/ui/scroll-reveal";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

interface FaqItem {
    question: string;
    answer: string;
}

const Faq = () => {
    const { t } = useTranslation();
    const rawItems = t("about.faq.items", {
        returnObjects: true,
    }) as unknown;

    const items = useMemo(
        () => (Array.isArray(rawItems) ? (rawItems as FaqItem[]) : []),
        [rawItems],
    );

    if (!items.length) {
        return null;
    }

    return (
        <section
            id="faq"
            className="relative overflow-hidden bg-[linear-gradient(180deg,#fff8ef_0%,#ffffff_48%,#fffaf3_100%)] py-20 md:py-28"
        >
            <div
                aria-hidden="true"
                className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-bravita-orange/10 blur-3xl"
            />

            <div className="relative container mx-auto px-4">
                <ScrollReveal delay={0.05}>
                    <div className="mx-auto max-w-3xl text-center">
                        <span className="mb-3 block text-sm font-bold uppercase tracking-[0.24em] text-bravita-orange">
                            {t("about.faq.badge")}
                        </span>
                        <h3 className="text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
                            {t("about.faq.title")} {" "}
                            <span className="bg-linear-to-r from-bravita-yellow via-bravita-orange to-bravita-red bg-clip-text text-transparent">
                                {t("about.faq.title_accent")}
                            </span>
                        </h3>
                        <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
                            {t("about.faq.description")}
                        </p>
                    </div>
                </ScrollReveal>

                <ScrollReveal delay={0.12}>
                    <div className="mx-auto mt-10 max-w-4xl rounded-4xl border border-orange-100/80 bg-white/90 p-4 shadow-[0_24px_80px_-40px_rgba(236,119,44,0.28)] backdrop-blur sm:p-6 md:mt-12 md:p-8">
                        <Accordion type="single" collapsible className="w-full">
                            {items.map((item, index) => (
                                <AccordionItem
                                    key={`${item.question}-${index}`}
                                    value={`faq-item-${index}`}
                                    className="border-b border-orange-100/80 last:border-b-0"
                                >
                                    <AccordionTrigger className="gap-4 py-5 text-left text-base font-bold text-[#2D334A] hover:no-underline md:text-lg">
                                        {item.question}
                                    </AccordionTrigger>
                                    <AccordionContent className="pb-5 pr-8 text-sm leading-7 text-[#2D334A]/75 md:text-base">
                                        {item.answer}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                </ScrollReveal>
            </div>
        </section>
    );
};

export default Faq;
