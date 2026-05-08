import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const GOOGLE_FONTS_URL = "https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Nunito:wght@400;600;700;800;900&display=swap";
const EXTENDED_FONT_STACK = "'Baloo 2', 'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const COMPACT_FONT_STACK = "'Baloo 2', 'Nunito', sans-serif";
const BODY_WITHOUT_INLINE_FONT = '<body style="margin: 0; padding: 0; background-color: #FFFBF7;">';

const TEMPLATE_FILES = [
  "email_templates/confirm_signup.html",
  "email_templates/reset_password.html",
  "email_templates/password_changed.html",
  "email_templates/welcome_template.html",
  "email_templates/order_confirmation.html",
  "email_templates/order_delivered.html",
  "supabase/functions/send-order-email/template.ts",
  "supabase/functions/send-welcome-email/index.ts",
];

describe("email template font stack governance", () => {
  for (const relativePath of TEMPLATE_FILES) {
    it(`${relativePath} keeps Google Fonts link and extended fallback stack`, () => {
      const absolutePath = resolve(process.cwd(), relativePath);
      const content = readFileSync(absolutePath, "utf8");

      expect(content).toContain(GOOGLE_FONTS_URL);
      expect(content).toContain(EXTENDED_FONT_STACK);
      expect(content).not.toContain(COMPACT_FONT_STACK);
      expect(content).not.toContain("font-family: sans-serif");
      expect(content).not.toContain(BODY_WITHOUT_INLINE_FONT);
    });
  }
});
