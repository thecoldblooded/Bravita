export type LegalDocumentKey = "terms" | "privacy" | "cookies" | "legalNotice" | "kvkk";

export interface LegalDocumentSection {
    heading: string;
    paragraphs: string[];
    items?: string[];
}

export interface LegalDocument {
    title: string;
    description: string;
    sections: LegalDocumentSection[];
}

export type LegalDocumentLocale = "tr" | "en";

const LEGAL_DOCUMENTS_TR: Record<LegalDocumentKey, LegalDocument> = {
    terms: {
        title: "Kullanım Koşulları",
        description:
            "Lütfen www.bravita.com.tr web sitesini kullanmadan önce bu koşulları dikkatlice okuyunuz.",
        sections: [
            {
                heading: "1. Koşulların Kabulü",
                paragraphs: [
                    "Bu Site, Valco İlaç Medikal Kozmetik Sanayi ve Ticaret Limited Şirketi (\"Şirket\") tarafından yönetilmektedir.",
                    "Siteye erişim sağlamakla ve Siteyi kullanmakla, bu kullanım koşullarını okuduğunuzu, anladığınızı ve yasal olarak bağlı olduğunuzu kabul etmiş sayılırsınız.",
                    "Koşulları kabul etmiyorsanız Siteyi kullanmamanız gerekir.",
                ],
            },
            {
                heading: "2. Bilgilerin Tıbbi Tavsiye Niteliği Taşımaması",
                paragraphs: [
                    "Sitede sunulan tüm içerikler, ürün bilgileri ve bilgilendirici metinler yalnızca genel bilgilendirme ve tanıtım amaçlıdır.",
                    "Bu içerikler hiçbir şekilde profesyonel tıbbi tavsiye, teşhis veya tedavi yerine geçmez.",
                    "Herhangi bir takviye edici gıda kullanımına başlamadan önce doktor veya eczacı görüşü almanız önerilir.",
                ],
                items: [
                    "Takviye edici gıdalar ilaç değildir.",
                    "Ürünler hastalıkların önlenmesi veya tedavi edilmesi amacıyla kullanılamaz.",
                    "Hamilelik, emzirme, kronik rahatsızlık veya düzenli ilaç kullanımı durumunda sağlık profesyoneline danışılması gerekir.",
                    "Sitedeki bilgilere dayanarak tıbbi tedavinin ertelenmesi veya bırakılmasından Şirket sorumlu değildir.",
                ],
            },
            {
                heading: "3. Fikri Mülkiyet Hakları",
                paragraphs: [
                    "Sitede yer alan metinler, görseller, grafikler, logolar, marka adları, ürün isimleri ve diğer tüm içerikler Şirkete veya ilgili hak sahiplerine aittir.",
                    "Bu içerikler, Türk hukukuna ve uluslararası fikri mülkiyet mevzuatına göre korunmaktadır.",
                    "Şirketin yazılı izni olmaksızın içerikler kopyalanamaz, çoğaltılamaz, dağıtılamaz veya ticari amaçla kullanılamaz.",
                ],
            },
            {
                heading: "4. Sorumluluğun Sınırlandırılması",
                paragraphs: [
                    "Şirket, Site içeriğinin doğru ve güncel kalması için makul çabayı gösterir; ancak bilgilerin eksiksiz, hatasız veya kesintisiz olacağını garanti etmez.",
                    "Site içeriğine dayanılarak alınan kararlar ve gerçekleştirilen işlemlerden doğabilecek sonuçlardan kullanıcı sorumludur.",
                    "Site kullanımından veya kullanılamamasından kaynaklanabilecek doğrudan ya da dolaylı zararlardan Şirket sorumlu tutulamaz.",
                ],
            },
            {
                heading: "5. Üçüncü Taraf Bağlantıları",
                paragraphs: [
                    "Site, Şirket kontrolü dışında olan üçüncü taraf web sitelerine bağlantılar içerebilir.",
                    "Bu bağlantıların sunulması, ilgili sitelerin içeriklerinin onaylandığı veya garanti edildiği anlamına gelmez.",
                    "Üçüncü taraf sitelerin kullanım koşulları ve gizlilik politikaları kendi sorumluluklarındadır.",
                ],
            },
            {
                heading: "6. Koşulların Değiştirilmesi",
                paragraphs: [
                    "Şirket, kullanım koşullarını önceden bildirimde bulunmaksızın güncelleme hakkını saklı tutar.",
                    "Güncellenen koşullar, Sitede yayınlandığı andan itibaren geçerli olur.",
                    "Siteyi kullanmaya devam etmeniz, güncel koşulları kabul ettiğiniz anlamına gelir.",
                ],
            },
            {
                heading: "7. Uygulanacak Hukuk ve Yetkili Mahkeme",
                paragraphs: [
                    "Bu koşullardan doğacak veya koşullarla bağlantılı uyuşmazlıklarda Türk Hukuku uygulanır.",
                    "Uyuşmazlıkların çözümünde Ankara Mahkemeleri ve İcra Daireleri yetkilidir.",
                ],
            },
            {
                heading: "8. İletişim",
                paragraphs: [
                    "Kullanım koşullarıyla ilgili sorularınız için bizimle iletişime geçebilirsiniz:",
                ],
                items: [
                    "E-posta: support@bravita.com.tr",
                    "Telefon: 444 51 73",
                ],
            },
        ],
    },
    privacy: {
        title: "Gizlilik Politikası",
        description:
            "Bu politika, kişisel verilerinizin 6698 sayılı KVKK kapsamında nasıl işlendiğini ve korunduğunu açıklar.",
        sections: [
            {
                heading: "1. Giriş",
                paragraphs: [
                    "Bu Gizlilik Politikası, www.bravita.com.tr web sitesini ziyaret eden veya site üzerinden işlem yapan kullanıcıların kişisel verilerinin işlenmesine ilişkin esasları düzenler.",
                    "Şirket, veri sorumlusu sıfatıyla kişisel verilerinizin güvenliğine önem verir ve verileri yalnızca hukuka uygun amaçlarla işler.",
                ],
            },
            {
                heading: "2. Veri Sorumlusunun Kimliği",
                paragraphs: [
                    "Ticari Unvan: Valco İlaç Medikal Kozmetik Sanayi ve Ticaret Limited Şirketi",
                ],
                items: [
                    "Adres: Prof. Dr. Ahmet Taner Kışlalı Mah. Alacaatlı Cad. No:30/5A Çankaya - Ankara",
                    "E-posta: support@bravita.com.tr",
                    "Telefon: 444 51 73",
                ],
            },
            {
                heading: "3. İşlenen Kişisel Veriler ve İşleme Amaçları",
                paragraphs: [
                    "Sunduğumuz hizmetler kapsamında aşağıdaki kategorilerde kişisel veriler işlenebilir:",
                ],
                items: [
                    "Kimlik ve iletişim bilgileri: ad-soyad, e-posta, telefon, teslimat/fatura adresi.",
                    "Hesap bilgileri: üyelik, oturum, güvenlik ve doğrulama kayıtları.",
                    "Sipariş ve ödeme süreci bilgileri: sipariş içeriği, teslimat süreçleri ve işlem kayıtları.",
                    "Destek talepleri: destek formu/iletişim kanalları üzerinden iletilen içerikler.",
                    "Teknik veriler: IP adresi, cihaz/tarayıcı bilgisi, ziyaret zamanı, çerez ve log kayıtları.",
                    "Amaçlar: sipariş yönetimi, müşteri desteği, güvenlik, dolandırıcılık önleme, yasal yükümlülüklerin yerine getirilmesi, hizmet kalitesi ve kullanıcı deneyiminin iyileştirilmesi.",
                ],
            },
            {
                heading: "4. Kişisel Veri İşlemenin Hukuki Sebepleri",
                paragraphs: [
                    "Kişisel verileriniz KVKK madde 5 ve ilgili mevzuat kapsamında işlenir.",
                ],
                items: [
                    "Sözleşmenin kurulması veya ifası için gerekli olması.",
                    "Hukuki yükümlülüklerin yerine getirilmesi.",
                    "Bir hakkın tesisi, kullanılması veya korunması.",
                    "Meşru menfaatler kapsamında, temel hak ve özgürlüklerinize zarar vermeyecek şekilde veri işlenmesi.",
                    "Açık rıza gerektiren hallerde açık rızanın alınması.",
                ],
            },
            {
                heading: "5. Kişisel Verilerin Aktarılması",
                paragraphs: [
                    "Kişisel verileriniz, hizmetlerin sunulabilmesi için gerekli olduğu ölçüde ve mevzuata uygun şekilde üçüncü taraflarla paylaşılabilir.",
                ],
                items: [
                    "Ödeme, kargo/lojistik, barındırma (hosting), altyapı ve analitik hizmet sağlayıcıları.",
                    "Yetkili kamu kurum ve kuruluşları ile adli/idari merciler.",
                    "Hukuki ve operasyonel danışmanlık hizmeti alınan taraflar.",
                ],
            },
            {
                heading: "6. Kişisel Veri Toplama Yöntemi ve Saklama",
                paragraphs: [
                    "Veriler; üyelik/sipariş formları, destek başvuruları, çerezler ve teknik loglar aracılığıyla elektronik ortamda toplanır.",
                    "Kişisel veriler, işleme amacı için gerekli süre boyunca ve ilgili mevzuatta öngörülen saklama süreleri kadar muhafaza edilir.",
                ],
            },
            {
                heading: "7. İlgili Kişinin Hakları (KVKK m.11)",
                paragraphs: [
                    "KVKK uyarınca, veri sahibi olarak aşağıdaki haklara sahipsiniz:",
                ],
                items: [
                    "Kişisel verilerinizin işlenip işlenmediğini öğrenme.",
                    "İşlenmişse buna ilişkin bilgi talep etme.",
                    "İşleme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme.",
                    "Yurt içinde/yurt dışında aktarıldığı üçüncü kişileri bilme.",
                    "Eksik veya yanlış işlenen verilerin düzeltilmesini isteme.",
                    "KVKK kapsamındaki şartlar oluşmuşsa silme veya yok edilmesini isteme.",
                    "Düzeltme/silme işlemlerinin aktarılan üçüncü kişilere bildirilmesini isteme.",
                    "Otomatik sistemlerle analiz sonucu aleyhe bir sonuca itiraz etme.",
                    "Kanuna aykırı işleme nedeniyle zararın giderilmesini talep etme.",
                ],
            },
            {
                heading: "8. Başvuru ve Güncellemeler",
                paragraphs: [
                    "Haklarınıza ilişkin taleplerinizi support@bravita.com.tr adresine iletebilirsiniz.",
                    "Başvurularınız, mevzuattaki süreler içinde sonuçlandırılır.",
                    "Şirket, yasal düzenlemeler ve operasyonel ihtiyaçlar doğrultusunda bu politikayı güncelleyebilir.",
                ],
            },
        ],
    },
    cookies: {
        title: "Çerez Politikası",
        description:
            "Bu politika, www.bravita.com.tr üzerinde kullanılan çerezler hakkında sizi bilgilendirmek amacıyla hazırlanmıştır.",
        sections: [
            {
                heading: "1. Giriş",
                paragraphs: [
                    "Bu Çerez Politikası, Siteyi ziyaret ettiğinizde kullanılan çerezlerin kapsamı ve amacı hakkında bilgi verir.",
                    "Siteyi kullanmaya devam etmeniz, zorunlu çerezlerin kullanımını kabul ettiğiniz anlamına gelir. Açık rıza gerektiren çerezler için tercihlerinizi panel üzerinden yönetebilirsiniz.",
                ],
            },
            {
                heading: "2. Çerez (Cookie) Nedir?",
                paragraphs: [
                    "Çerezler, bir web sitesini ziyaret ettiğinizde cihazınıza tarayıcınız aracılığıyla kaydedilen küçük metin dosyalarıdır.",
                    "Bu dosyalar, tercihlerinizi hatırlamaya ve kullanıcı deneyimini iyileştirmeye yardımcı olur.",
                ],
            },
            {
                heading: "3. Çerezleri Hangi Amaçlarla Kullanıyoruz?",
                paragraphs: [
                    "Sitede çerezleri şu temel amaçlarla kullanırız:",
                ],
                items: [
                    "Site güvenliği ve temel fonksiyonların çalışması.",
                    "Performans analizi ve teknik iyileştirme.",
                    "Kullanım tercihlerini hatırlama ve deneyimi kişiselleştirme.",
                    "Pazarlama/yeniden pazarlama faaliyetlerinin ölçümlenmesi (varsa).",
                ],
            },
            {
                heading: "4. Kullanılan Çerez Türleri",
                paragraphs: [
                    "Sitede aşağıdaki çerez türleri kullanılabilir:",
                ],
                items: [
                    "Zorunlu Çerezler: Site işlevleri için gereklidir.",
                    "Performans ve Analitik Çerezleri: Ziyaret ve kullanım eğilimlerini anonim olarak analiz eder.",
                    "İşlevsel Çerezler: Dil ve benzeri tercihleri hatırlar.",
                    "Reklam/Pazarlama Çerezleri: İlgi alanlarına göre içerik veya kampanya gösterimini destekler.",
                ],
            },
            {
                heading: "5. Çerezleri Yönetme",
                paragraphs: [
                    "Çoğu tarayıcı çerezleri otomatik kabul eder; ancak tarayıcı ayarlarınız üzerinden çerezleri engelleyebilir veya silebilirsiniz.",
                    "Çerezlerin devre dışı bırakılması, Site fonksiyonlarının bir kısmının beklenen şekilde çalışmamasına neden olabilir.",
                ],
            },
            {
                heading: "6. Politika Güncellemeleri",
                paragraphs: [
                    "Şirket, bu Çerez Politikası üzerinde mevzuat ve hizmet gereksinimlerine göre değişiklik yapabilir.",
                    "Güncel metin, Sitede yayınlandığı tarihten itibaren geçerli olur.",
                ],
            },
        ],
    },
    legalNotice: {
        title: "Yasal Uyarı",
        description:
            "www.bravita.com.tr üzerinde yer alan içerikler aşağıdaki yasal uyarılara tabidir.",
        sections: [
            {
                heading: "1. Tıbbi Tavsiye Niteliği Taşımamaktadır",
                paragraphs: [
                    "Sitede yer alan ürün tanıtımları, yazılar ve diğer içerikler yalnızca genel bilgilendirme amacıyla hazırlanmıştır.",
                    "Hiçbir içerik, profesyonel tıbbi tavsiye, teşhis veya tedavi yerine geçmez.",
                ],
            },
            {
                heading: "2. Ürünler İlaç Değildir",
                paragraphs: [
                    "Sitede tanıtılan ürünler takviye edici gıdadır; ilaç değildir.",
                    "Ürünler, hastalıkların önlenmesi veya tedavi edilmesi amacıyla kullanılamaz.",
                ],
            },
            {
                heading: "3. Sağlık Beyanları Hakkında",
                paragraphs: [
                    "Ürünlere ilişkin açıklamalar, ilgili mevzuat ve yetkili kurumların düzenlemeleri dikkate alınarak hazırlanır.",
                    "Sitede, ürünlerin herhangi bir hastalığı tedavi ettiği veya iyileştirdiği yönünde bir iddiada bulunulmaz.",
                ],
            },
            {
                heading: "4. Kullanım Sorumluluğu",
                paragraphs: [
                    "Takviye edici gıda kullanmadan önce aşağıdaki durumlarda mutlaka doktor veya eczacı görüşü alınmalıdır:",
                ],
                items: [
                    "Hamilelik veya emzirme dönemi.",
                    "Mevcut kronik/akut rahatsızlıklar.",
                    "Reçeteli veya reçetesiz ilaç kullanımı.",
                    "Önerilen günlük porsiyon aşılmamalıdır.",
                    "Takviye edici gıdalar normal beslenmenin yerine geçmez.",
                    "Çocukların ulaşamayacağı yerde saklanmalıdır.",
                ],
            },
            {
                heading: "5. Sorumluluğun Reddi",
                paragraphs: [
                    "Sitedeki bilgilere dayanarak doktor önerisi olmadan gerçekleştirilen kullanım, karar ve uygulamalardan doğabilecek sonuçlardan kullanıcı sorumludur.",
                    "Site içeriğinin kullanımından kaynaklanabilecek doğrudan veya dolaylı zararlardan Şirket sorumlu tutulamaz.",
                ],
            },
            {
                heading: "6. Kullanım Koşulları ile Birlikte Değerlendirme",
                paragraphs: [
                    "Bu yasal uyarılar, Kullanım Koşulları metninin ayrılmaz bir parçasıdır.",
                ],
            },
        ],
    },
    kvkk: {
        title: "KVKK Açık Rıza Metni",
        description:
            "Kişisel verilerinizin işlenmesine ilişkin açık rıza beyanıdır.",
        sections: [
            {
                heading: "AÇIK RIZA METNİ",
                paragraphs: [
                    "Valco İlaç Medikal Kozmetik Sanayi ve Ticaret Limited Şirketi (\"Valco\")’ne ait web sitesi olan www.bravita.com.tr (“web sitesi” olarak anılacaktır) adresi üzerinden iletişim kurmam ve hizmetlerinden faydalanmam sebebiyle Ad, soyad vb. kimlik bilgileri, adres, iş veya özel e-posta adresi, telefon numarası v.b iletişim bilgileri, sitenin kullanılması esnasında siteye yükleyeceğim içerik yazı, fotoğraf, bilgi v.s, İşlem Güvenliği Bilgisi, IP bilgileri ve log kaydı ile kendimi tanıtmak için verdiğim kişisel verilerimin 6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) uyarınca, aydınlatma metninde açıklandığı çerçevede; işlenmesini, kaydedilmesini, saklanmasını, güncellenmesini ve 3. kişilerle paylaşılmasını kabul ediyorum.",
                    "İlgili Valco Aydınlatma Metni, iletişim formu aracılığı ile Valco ile iletişim kurma talebim, web sitesi’nin kullanımı ve sözleşme kuruluşu esnasında tebliğ edilmiş, ayrıca web sitesinde yer almaktadır.",
                ],
            },
            {
                heading: "Veri İşleme ve Aktarım",
                paragraphs: [
                    "Kişisel verilerimin Valco tarafından yukarıda ve aydınlatma metninde belirtilen amaçlar dâhilinde işlenmesine ve aydınlatma metni/açık rıza metninde belirtilen kişi ve kurumlara aktarılmasına ilişkin açık rıza veriyorum. İşbu metindeki açıklamaları okudum, anladım ve kabul ediyorum.",
                ],
            },
            {
                heading: "Haklarınız",
                paragraphs: [
                    "6698 sayılı kanun ve diğer mevzuat hükümleri uyarınca Valco’ya başvurarak tarafımla ilgili;",
                ],
                items: [
                    "Kişisel veri işlenip işlenmediğini öğrenme,",
                    "Kişisel verileri işlenmişse buna ilişkin bilgi talep etme,",
                    "Kişisel verilerin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme,",
                    "Yurt içinde veya yurt dışında kişisel verilerin aktarıldığı üçüncü kişileri bilme,",
                    "Kişisel verilerin eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme haklarınızı kullanabilirsiniz.",
                ],
            },
            {
                heading: "Beyan",
                paragraphs: [
                    "Kanunun “ilgili kişinin haklarını düzenleyen” 11. Maddesi kapsamındaki taleplerinize ilişkin olarak, “Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğe” göre Valco’ya başvuru hakkım bulunduğu konusunda bilgilendirildim.",
                    "İşbu Açık Rıza Metni’nde yer alan hususlarla alakalı olarak açık rıza vermiş olduğum kişisel verilerimin, yukarıda açıklanmış olan amaçlarla işlenmesine ve belirtilen üçüncü kişilerle paylaşılmasına hiçbir etki altında kalmadan işbu metni okuyarak açık rıza veriyorum.",
                ],
            },
        ],
    },
};

const LEGAL_DOCUMENTS_EN: Record<LegalDocumentKey, LegalDocument> = {
    terms: {
        title: "Terms of Use",
        description:
            "Please read these terms carefully before using the www.bravita.com.tr website.",
        sections: [
            {
                heading: "1. Acceptance of Terms",
                paragraphs: [
                    "This Site is operated by Valco İlaç Medikal Kozmetik Sanayi ve Ticaret Limited Şirketi (the \"Company\").",
                    "By accessing and using the Site, you are deemed to have read, understood, and legally accepted these terms of use.",
                    "If you do not accept these terms, you should not use the Site.",
                ],
            },
            {
                heading: "2. Information Is Not Medical Advice",
                paragraphs: [
                    "All content, product information, and informational texts provided on the Site are for general information and promotional purposes only.",
                    "This content does not constitute professional medical advice, diagnosis, or treatment.",
                    "You are advised to consult a doctor or pharmacist before starting any dietary supplement.",
                ],
                items: [
                    "Dietary supplements are not medicines.",
                    "Products cannot be used for the prevention or treatment of diseases.",
                    "In cases of pregnancy, breastfeeding, chronic illness, or regular medication use, consultation with a healthcare professional is required.",
                    "The Company is not responsible for delays, interruption, or discontinuation of medical treatment based on information on the Site.",
                ],
            },
            {
                heading: "3. Intellectual Property Rights",
                paragraphs: [
                    "All texts, visuals, graphics, logos, trademarks, product names, and other content on the Site belong to the Company or relevant rights holders.",
                    "This content is protected under Turkish law and international intellectual property legislation.",
                    "Without the Company’s written permission, the content may not be copied, reproduced, distributed, or used for commercial purposes.",
                ],
            },
            {
                heading: "4. Limitation of Liability",
                paragraphs: [
                    "The Company makes reasonable efforts to keep Site content accurate and up to date; however, it does not guarantee that the information is complete, error-free, or uninterrupted.",
                    "Users are responsible for decisions and actions taken based on Site content.",
                    "The Company shall not be held liable for direct or indirect damages arising from the use or inability to use the Site.",
                ],
            },
            {
                heading: "5. Third-Party Links",
                paragraphs: [
                    "The Site may contain links to third-party websites that are outside the Company’s control.",
                    "Providing these links does not mean that the Company approves or guarantees the content of those websites.",
                    "The terms of use and privacy policies of third-party websites are under their own responsibility.",
                ],
            },
            {
                heading: "6. Changes to the Terms",
                paragraphs: [
                    "The Company reserves the right to update these terms of use without prior notice.",
                    "Updated terms become effective as soon as they are published on the Site.",
                    "Your continued use of the Site means that you accept the updated terms.",
                ],
            },
            {
                heading: "7. Governing Law and Jurisdiction",
                paragraphs: [
                    "Turkish law applies to disputes arising from or related to these terms.",
                    "Ankara Courts and Enforcement Offices have jurisdiction for dispute resolution.",
                ],
            },
            {
                heading: "8. Contact",
                paragraphs: [
                    "For questions regarding these terms of use, you may contact us:",
                ],
                items: [
                    "Email: support@bravita.com.tr",
                    "Phone: 444 51 73",
                ],
            },
        ],
    },
    privacy: {
        title: "Privacy Policy",
        description:
            "This policy explains how your personal data is processed and protected under the Turkish Personal Data Protection Law No. 6698 (KVKK).",
        sections: [
            {
                heading: "1. Introduction",
                paragraphs: [
                    "This Privacy Policy sets out the principles regarding the processing of personal data of users who visit www.bravita.com.tr or perform transactions through the Site.",
                    "As data controller, the Company values the security of your personal data and processes data only for lawful purposes.",
                ],
            },
            {
                heading: "2. Identity of the Data Controller",
                paragraphs: [
                    "Trade Name: Valco İlaç Medikal Kozmetik Sanayi ve Ticaret Limited Şirketi",
                ],
                items: [
                    "Address: Prof. Dr. Ahmet Taner Kışlalı Mah. Alacaatlı Cad. No:30/5A Çankaya - Ankara",
                    "Email: support@bravita.com.tr",
                    "Phone: 444 51 73",
                ],
            },
            {
                heading: "3. Categories of Personal Data Processed and Processing Purposes",
                paragraphs: [
                    "Within the scope of our services, personal data may be processed in the following categories:",
                ],
                items: [
                    "Identity and contact data: full name, email, phone number, delivery/invoice address.",
                    "Account data: membership, session, security, and verification records.",
                    "Order and payment process data: order content, delivery processes, and transaction records.",
                    "Support requests: content submitted via support forms and communication channels.",
                    "Technical data: IP address, device/browser details, visit time, cookie and log records.",
                    "Purposes: order management, customer support, security, fraud prevention, fulfillment of legal obligations, service quality, and improving user experience.",
                ],
            },
            {
                heading: "4. Legal Grounds for Processing Personal Data",
                paragraphs: [
                    "Your personal data is processed in accordance with Article 5 of KVKK and relevant legislation.",
                ],
                items: [
                    "Processing is necessary for the establishment or performance of a contract.",
                    "Compliance with legal obligations.",
                    "Establishment, exercise, or protection of a right.",
                    "Processing based on legitimate interests, provided that fundamental rights and freedoms are not harmed.",
                    "Obtaining explicit consent where required.",
                ],
            },
            {
                heading: "5. Transfer of Personal Data",
                paragraphs: [
                    "Your personal data may be shared with third parties to the extent necessary for service delivery and in compliance with legislation.",
                ],
                items: [
                    "Payment, cargo/logistics, hosting, infrastructure, and analytics service providers.",
                    "Authorized public institutions and judicial/administrative authorities.",
                    "Parties providing legal and operational consultancy services.",
                ],
            },
            {
                heading: "6. Data Collection Methods and Retention",
                paragraphs: [
                    "Data is collected electronically through membership/order forms, support applications, cookies, and technical logs.",
                    "Personal data is retained for as long as necessary for processing purposes and for statutory retention periods under applicable legislation.",
                ],
            },
            {
                heading: "7. Data Subject Rights (KVKK Art. 11)",
                paragraphs: [
                    "Under KVKK, as a data subject, you have the following rights:",
                ],
                items: [
                    "To learn whether your personal data is processed.",
                    "To request information if it has been processed.",
                    "To learn the purpose of processing and whether data is used in accordance with that purpose.",
                    "To know third parties to whom your data is transferred domestically or abroad.",
                    "To request correction of incomplete or inaccurate data.",
                    "To request deletion or destruction where KVKK conditions are met.",
                    "To request notification of correction/deletion to third parties to whom data was transferred.",
                    "To object to a result against you arising from analysis by automated systems.",
                    "To request compensation for damages due to unlawful processing.",
                ],
            },
            {
                heading: "8. Applications and Updates",
                paragraphs: [
                    "You may submit your requests regarding your rights to support@bravita.com.tr.",
                    "Your applications are finalized within the periods prescribed by legislation.",
                    "The Company may update this policy in line with legal requirements and operational needs.",
                ],
            },
        ],
    },
    cookies: {
        title: "Cookie Policy",
        description:
            "This policy has been prepared to inform you about cookies used on www.bravita.com.tr.",
        sections: [
            {
                heading: "1. Introduction",
                paragraphs: [
                    "This Cookie Policy provides information about the scope and purpose of cookies used when you visit the Site.",
                    "By continuing to use the Site, you accept the use of strictly necessary cookies. You may manage your preferences through the panel for cookies that require explicit consent.",
                ],
            },
            {
                heading: "2. What Is a Cookie?",
                paragraphs: [
                    "Cookies are small text files stored on your device via your browser when you visit a website.",
                    "These files help remember your preferences and improve user experience.",
                ],
            },
            {
                heading: "3. Why Do We Use Cookies?",
                paragraphs: [
                    "We use cookies on the Site for the following main purposes:",
                ],
                items: [
                    "Site security and operation of core functionalities.",
                    "Performance analysis and technical improvement.",
                    "Remembering usage preferences and personalizing experience.",
                    "Measurement of marketing/remarketing activities (if applicable).",
                ],
            },
            {
                heading: "4. Types of Cookies Used",
                paragraphs: [
                    "The following cookie types may be used on the Site:",
                ],
                items: [
                    "Strictly Necessary Cookies: required for Site functions.",
                    "Performance and Analytics Cookies: anonymously analyze visit and usage trends.",
                    "Functional Cookies: remember language and similar preferences.",
                    "Advertising/Marketing Cookies: support interest-based content or campaign display.",
                ],
            },
            {
                heading: "5. Managing Cookies",
                paragraphs: [
                    "Most browsers automatically accept cookies; however, you can block or delete cookies via your browser settings.",
                    "Disabling cookies may cause some Site functions not to work as expected.",
                ],
            },
            {
                heading: "6. Policy Updates",
                paragraphs: [
                    "The Company may make changes to this Cookie Policy based on legal and service requirements.",
                    "The current text becomes effective as of the date it is published on the Site.",
                ],
            },
        ],
    },
    legalNotice: {
        title: "Legal Notice",
        description:
            "The content published on www.bravita.com.tr is subject to the following legal notices.",
        sections: [
            {
                heading: "1. Not Medical Advice",
                paragraphs: [
                    "Product promotions, articles, and other content on the Site are prepared for general informational purposes only.",
                    "No content constitutes professional medical advice, diagnosis, or treatment.",
                ],
            },
            {
                heading: "2. Products Are Not Medicines",
                paragraphs: [
                    "Products promoted on the Site are dietary supplements, not medicines.",
                    "Products cannot be used for the prevention or treatment of diseases.",
                ],
            },
            {
                heading: "3. About Health Claims",
                paragraphs: [
                    "Explanations regarding products are prepared by considering relevant legislation and regulations of competent authorities.",
                    "No claim is made on the Site that products treat or cure any disease.",
                ],
            },
            {
                heading: "4. Responsibility of Use",
                paragraphs: [
                    "Before using dietary supplements, you should consult a doctor or pharmacist in the following cases:",
                ],
                items: [
                    "Pregnancy or breastfeeding period.",
                    "Existing chronic/acute illnesses.",
                    "Use of prescription or over-the-counter medications.",
                    "The recommended daily portion should not be exceeded.",
                    "Dietary supplements do not replace normal nutrition.",
                    "Keep out of reach of children.",
                ],
            },
            {
                heading: "5. Disclaimer of Liability",
                paragraphs: [
                    "Users are responsible for consequences arising from use, decisions, and practices carried out without medical advice based on information on the Site.",
                    "The Company cannot be held liable for direct or indirect damages arising from the use of Site content.",
                ],
            },
            {
                heading: "6. Read Together with Terms of Use",
                paragraphs: [
                    "These legal notices are an integral part of the Terms of Use.",
                ],
            },
        ],
    },
    kvkk: {
        title: "KVKK Explicit Consent",
        description:
            "Explicit consent declaration regarding the processing of your personal data.",
        sections: [
            {
                heading: "EXPLICIT CONSENT TEXT",
                paragraphs: [
                    "I accept the processing, recording, storage, updating, and sharing with 3rd parties of my personal data, including identity information (name, surname, etc.), contact information (address, business or private e-mail address, phone number, etc.), content (text, photographs, information, etc.) I upload to the site during use, Transaction Security Information, IP information, and log records, which I provided to introduce myself via the website bravita.com.tr belonging to Valco İlaç Medikal Kozmetik Sanayi ve Ticaret Limited Şirketi (\"Valco\"), in accordance with the Law No. 6698 on the Protection of Personal Data (\"KVKK\") and within the framework explained in the clarification text.",
                    "The relevant Valco Clarification Text has been notified during my request to communicate with Valco via the contact form, the use of the website, and the establishment of the contract, and is also available on the website.",
                ],
            },
            {
                heading: "Data Processing and Transfer",
                paragraphs: [
                    "I give my explicit consent to the processing of my personal data by Valco for the purposes specified above and in the clarification text, and to the transfer of it to the persons and institutions specified in the clarification text/explicit consent text. I have read, understood, and accept the explanations in this text.",
                ],
            },
            {
                heading: "Rights",
                paragraphs: [
                    "In accordance with Law No. 6698 and other legislation, you can exercise your rights regarding yourself by applying to Valco:",
                ],
                items: [
                    "Learning whether personal data is processed,",
                    "Requesting information if personal data has been processed,",
                    "Learning the purpose of processing and whether they are used in accordance with the purpose,",
                    "Knowing the third parties to whom personal data is transferred domestically or abroad,",
                    "Requesting correction of personal data in case of incomplete or incorrect processing.",
                ],
            },
            {
                heading: "Declaration",
                paragraphs: [
                    "Regarding your requests within the scope of Article 11 of the Law, which \"regulates the rights of the data subject,\" I have been informed that I have the right to apply to Valco according to the \"Communiqué on the Procedures and Principles of Application to the Data Controller.\"",
                    "By reading this text, I give my explicit consent to the processing of my personal data for the purposes explained above and to sharing it with the specified third parties, without being under any influence regarding the issues included in this Explicit Consent Text.",
                ],
            },
        ],
    },
};

export const LEGAL_DOCUMENTS_BY_LOCALE: Record<
    LegalDocumentLocale,
    Record<LegalDocumentKey, LegalDocument>
> = {
    tr: LEGAL_DOCUMENTS_TR,
    en: LEGAL_DOCUMENTS_EN,
};

export function getLegalLocale(language: string | null | undefined): LegalDocumentLocale {
    if (language?.toLowerCase().startsWith("tr")) {
        return "tr";
    }

    return "en";
}

export function getLegalDocuments(locale: LegalDocumentLocale): Record<LegalDocumentKey, LegalDocument> {
    return LEGAL_DOCUMENTS_BY_LOCALE[locale];
}

export const LEGAL_DOCUMENTS: Record<LegalDocumentKey, LegalDocument> = LEGAL_DOCUMENTS_TR;
