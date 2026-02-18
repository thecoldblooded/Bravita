import { useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { m } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SalesAgreementsProps {
    user: {
        full_name: string | null;
        email: string;
        phone: string | null;
    } | null;
    address: {
        street: string;
        city: string;
        district?: string;
        postal_code: string;
    } | null;
    items: Array<{
        name: string;
        quantity: number;
        price: number;
    }>;
    totals: {
        total: number;
    };
    paymentMethod: "credit_card" | "bank_transfer";
}

function AgreementItem({ title, children }: { title: string, children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden mb-4 bg-white">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 text-sm font-bold text-gray-900 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
                {title}
                <ChevronDown className={`w-4 h-4 text-orange-500 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
            </button>
            <m.div
                initial={false}
                animate={{ height: isOpen ? "auto" : 80 }}
                className="relative overflow-hidden bg-white"
            >
                <div
                    className="p-4 text-xs text-gray-500 space-y-4"
                    onClick={() => !isOpen && setIsOpen(true)}
                    style={{ cursor: !isOpen ? 'pointer' : 'text' }}
                >
                    {children}
                </div>
                {!isOpen && (
                    <div
                        className="absolute bottom-0 left-0 right-0 h-16 bg-linear-to-t from-white via-white/80 to-transparent pointer-events-none"
                    />
                )}
            </m.div>
        </div>
    );
}

export function SalesAgreements({ user, address, items, totals, paymentMethod }: SalesAgreementsProps) {
    const { t } = useTranslation();
    const currentDate = format(new Date(), "dd.MM.yyyy", { locale: tr });
    const fullAddress = address ? `${address.street} ${address.district ? address.district + " " : ""}${address.city} ${address.postal_code}` : "";
    const buyerName = user?.full_name || user?.email || t("common.guest_user", "Misafir Kullanıcı");
    const buyerPhone = user?.phone || "-";
    const buyerEmail = user?.email || "-";

    const paymentMethodText = paymentMethod === "credit_card" ? t('checkout.payment.credit_card') : t('checkout.payment.bank_transfer');

    return (
        <div className="mt-8">
            <AgreementItem title={t('checkout.agreements.pre_info_title')}>
                <div className="space-y-2">
                    <h4 className="font-bold text-gray-900">{t('checkout.agreements.seller')}:</h4>
                    <p>
                        {t('checkout.agreements.title_label')}: D-Market Elektronik Hizmetler ve Ticaret A.Ş.<br />
                        {t('checkout.agreements.address_label')}: Kuştepe Mah. Mecidiyeköy Yolu Cad. Trump Towers No:12 Kule:2 Kat:2 Şişli/İSTANBUL<br />
                        {t('checkout.agreements.phone_label')}: 0212 705 68 00<br />
                        {t('checkout.agreements.fax_label')}: 0216 592 65 28<br />
                        {t('checkout.agreements.customer_service_label')}: 0850 252 40 00<br />
                        {t('checkout.agreements.mersis_label')}: 0265017991000011
                    </p>

                    <h4 className="font-bold text-gray-900 mt-4">{t('checkout.agreements.intermediary')}</h4>
                    <p>
                        {t('checkout.agreements.title_label')}: D-MARKET ELEKTRONİK HİZMETLER VE TİCARET A.Ş<br />
                        {t('checkout.agreements.address_label')}: Kuştepe Mah. Mecidiyeköy Yolu Cad. No:12 Trump Towers Kule 2 Kat 2 Şişli/İstanbul<br />
                        {t('checkout.agreements.vkn_label')}: 2650179910 – Boğaziçi Kurumlar V.D.<br />
                        {t('checkout.agreements.phone_label')}: 0850 252 40 00<br />
                        {t('checkout.agreements.customer_service_label')}: 0850 252 40 00<br />
                        {t('checkout.agreements.mersis_label')}: 0265017991000011
                    </p>

                    <h3 className="font-bold text-center my-4 text-gray-900">{t('checkout.agreements.pre_info.header')}</h3>

                    <p><strong>{t('checkout.agreements.pre_info.article_1_title')}</strong></p>
                    <p>{t('checkout.agreements.pre_info.payment_method')} : {paymentMethodText}</p>
                    <p>{t('checkout.agreements.pre_info.payment_desc')}</p>

                    <div className="border border-gray-200 rounded p-2 my-2 space-y-1 bg-gray-50">
                        <p className="font-semibold border-b border-gray-200 pb-1 mb-1">{t('checkout.agreements.pre_info.table_header')}</p>
                        {items.map((item) => (
                            <p key={item.name}>{item.name} / {item.quantity} / ₺{(item.price * item.quantity).toFixed(2)}</p>
                        ))}
                        <p className="font-bold pt-1 mt-1 border-t border-gray-200 text-gray-900">{t('checkout.agreements.pre_info.total')}: ₺{totals.total.toFixed(2)}</p>
                    </div>

                    <p><strong>{t('checkout.agreements.pre_info.article_2_text')}</strong></p>

                    <p><strong>{t('checkout.agreements.pre_info.article_3_text')}</strong></p>

                    <p><strong>{t('checkout.agreements.pre_info.article_4_text')}</strong></p>

                    <p>{t('checkout.agreements.pre_info.article_4_calc')}</p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li>{t('checkout.agreements.pre_info.article_4_list_a')}</li>
                        <li>{t('checkout.agreements.pre_info.article_4_list_b')}</li>
                        <li>{t('checkout.agreements.pre_info.article_4_list_c')}</li>
                    </ul>
                    <p>{t('checkout.agreements.pre_info.article_4_link')}</p>

                    <p className="mt-2"><strong>{t('checkout.agreements.pre_info.exceptions_title')}</strong></p>
                    <ul className="list-disc pl-4 space-y-1">
                        {(t('checkout.agreements.pre_info.exceptions_list', { returnObjects: true }) as string[]).map((item, index) => (
                            <li key={`exception-${index}`}>{item}</li>
                        ))}
                    </ul>

                    <p><strong>{t('checkout.agreements.pre_info.article_5_text')}</strong></p>

                    <p><strong>{t('checkout.agreements.pre_info.article_6_text')}</strong></p>

                    <p><strong>{t('checkout.agreements.pre_info.article_7_text')}</strong></p>

                    <p><strong>{t('checkout.agreements.pre_info.article_8_text')}</strong></p>

                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="font-bold text-gray-900">{t('checkout.agreements.seller')}:</h4>
                        <p>D-Market Elektronik Hizmetler ve Ticaret A.Ş.</p>
                        <h4 className="font-bold mt-2 text-gray-900">{t('checkout.agreements.buyer')}:</h4>
                        <p>{buyerName} - {fullAddress}</p>
                        <p>{t('checkout.agreements.date')} : {currentDate}</p>
                    </div>
                </div>
            </AgreementItem>

            <AgreementItem title={t('checkout.agreements.sales_agreement_title')}>
                <div className="space-y-2">
                    <h3 className="font-bold text-center mb-4 text-gray-900">{t('checkout.agreements.sales_agreement.header')}</h3>
                    <p><strong>{t('checkout.agreements.sales_agreement.article_1_title')}</strong></p>
                    <div className="pl-4">
                        <p><strong>{t('checkout.agreements.sales_agreement.article_1_1_title')}:</strong></p>
                        <p>{t('checkout.agreements.title_label')}: D-Market Elektronik Hizmetler ve Ticaret A.Ş.</p>
                        <p>{t('checkout.agreements.address_label')}: Kuştepe Mah. Mecidiyeköy Yolu Cad. Trump Towers No:12 Kule:2 Kat:2 Şişli/İSTANBUL</p>
                        <p>{t('checkout.agreements.phone_label')}: 0212 705 68 00</p>
                        <p>{t('checkout.agreements.mersis_label')}: 0265017991000011</p>
                    </div>
                    <div className="pl-4 mt-2">
                        <p><strong>{t('checkout.agreements.buyer_consumer')}:</strong></p>
                        <p>{t('checkout.agreements.name_label', 'Adı/Soyadı/Ünvanı')}: {buyerName}</p>
                        <p>{t('checkout.agreements.address_label')} : {fullAddress}</p>
                        <p>{t('checkout.agreements.phone_label')}: {buyerPhone}</p>
                        <p>Email: {buyerEmail}</p>
                    </div>
                    <div className="pl-4 mt-2">
                        <p><strong>{t('checkout.agreements.sales_agreement.article_1_3_title')}:</strong></p>
                        <p>{t('checkout.agreements.title_label')}: D-MARKET ELEKTRONİK HİZMETLER VE TİCARET A.Ş</p>
                        <p>{t('checkout.agreements.address_label')}: Kuştepe Mah. Mecidiyeköy Yolu Cad. No:12 Trump Towers Kule 2 Kat 2 Şişli/İstanbul</p>
                    </div>

                    <p className="mt-4"><strong>{t('checkout.agreements.sales_agreement.article_2_title')}</strong></p>
                    <p>{t('checkout.agreements.sales_agreement.article_2_text')}</p>

                    <p className="mt-4"><strong>{t('checkout.agreements.sales_agreement.article_3_title')}</strong></p>
                    <p>{t('checkout.agreements.sales_agreement.article_3_1_text')}</p>
                    <div className="border border-gray-200 rounded p-2 my-2 space-y-1 bg-gray-50">
                        {items.map((item) => (
                            <p key={item.name}>{item.name} - {item.quantity} {t("cart.quantity_label", "Adet")} - ₺{(item.price * item.quantity).toFixed(2)}</p>
                        ))}
                    </div>

                    <p>{t('checkout.agreements.sales_agreement.article_3_2_text', { method: paymentMethodText })}</p>
                    <p>{t('checkout.agreements.sales_agreement.article_3_3_text')}</p>

                    <p className="mt-2"><strong>{t('checkout.agreements.sales_agreement.article_3_4_title')}</strong></p>
                    <p>{t('checkout.agreements.sales_agreement.article_3_4_text')}</p>
                    <p>{t('checkout.agreements.sales_agreement.article_3_4_a')}</p>
                    <p>{t('checkout.agreements.sales_agreement.article_3_4_b')}</p>

                    <p className="mt-2"><strong>{t('checkout.agreements.sales_agreement.article_3_5_title')}</strong></p>
                    <p>{t('checkout.agreements.sales_agreement.delivery_address_label')} : {fullAddress}</p>
                    <p>{t('checkout.agreements.sales_agreement.delivery_person_label')}: {buyerName}</p>
                    <p>{t('checkout.agreements.sales_agreement.invoice_address_label')} : {fullAddress}</p>
                    <p>{t('checkout.agreements.sales_agreement.shipping_cost_text')}</p>

                    <p className="mt-4"><strong>{t('checkout.agreements.sales_agreement.article_4_title')}</strong></p>
                    <p>{t('checkout.agreements.sales_agreement.article_4_text')}</p>

                    <p className="mt-4"><strong>{t('checkout.agreements.sales_agreement.article_5_title')}</strong></p>
                    <p>{t('checkout.agreements.sales_agreement.article_5_1')}</p>
                    <p>{t('checkout.agreements.sales_agreement.article_5_2')}</p>
                    <p>{t('checkout.agreements.sales_agreement.article_5_3')}</p>
                    <p>{t('checkout.agreements.sales_agreement.article_5_4')}</p>

                    <p className="mt-4"><strong>{t('checkout.agreements.sales_agreement.article_6_title')}</strong></p>
                    <p>{t('checkout.agreements.sales_agreement.article_6_text_1')}</p>
                    <p>{t('checkout.agreements.sales_agreement.article_6_text_2')}</p>

                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="font-bold text-gray-900">{t('checkout.agreements.seller')}:</h4>
                        <p>D-Market Elektronik Hizmetler ve Ticaret A.Ş.</p>
                        <h4 className="font-bold mt-2 text-gray-900">{t('checkout.agreements.buyer_consumer')}:</h4>
                        <p>{buyerName}</p>
                        <p>{t('checkout.agreements.date')} : {currentDate}</p>
                    </div>
                </div>
            </AgreementItem>
        </div>
    );
}
