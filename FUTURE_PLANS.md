# TODOs and Future Features

## Must have features
These features are mandatory in our production ready boilerplate, these features will be used in multiple webshops.

### Extra product selection checkbox
This is a reusable, clickable checkbox + label combo which when selected, adds an extra product on product page CTA click (like "kosárba"). Extra products can vary, the user should be able to select this on the product's admin page. It's not mandatory. Example use cases: a product that goes really well with a product, extra/fancy packaging, free gift etc...

### New components for the customer facing interface
We need to add more customer facing components. use for reference: tailwind plus, which has a few prebuilt component and layout sections specifically for ecommerce. ALso need to search for the most famous and successful component types usually used in ecommerce. We need to provide as much flexibility as possible.

### Improve products list page.
We need multiple versions and use the most appropriate for each webshop type. 
- A page which sells very few products should have a bigger, more eyecatching one with bigger images, more generous spacing. Especially if it doesn't have too much categories. If they don't have much products, categories filter options, we could get away with a really minimal, sorting and category picker like the current one. No price, color etc filters.
- A page that has 20+ products should showcase a normal sized product card. Depending on the product types the users should be able to filter products by category, price, color etc... should really depend on the product, we should expand this with future webshops.

### Review when an email is sent
Decide who gets notification in email and when.
- Sign up confirmation email when user signs up using email and password.
- Welcome email after first signup
- Password reset email
- Marketing emails sent by webshop owners
- Abandoned cart email
- Review emails

### Plans and their features
Decide what should be included. From emailing to analytics to usage.
For starters we should have basic and premium plans

#### Basic Plan:
This is everyone who doesn't want any extra features or usages.
Price: 9900 HUF
- Unlimited registered customers
- 1 admin user
- Landing page with every sections
- About us page
- Public facing blog page and admin page where they can add/edit blogs
- Public facing product list pages and admin page where they can add/edit products
- Public facing category list pages and admin page where they can add/edit categories
- Basic dashboard on admin page
- Basic analytics (monthly income, purchase counts, basic things)
- Coupons feature
- Reviews
- 2 Delivery options (besides MPL) (one house delivery, one pickup point)
- 30 days price change for products (mandatory from 2026 July?)
- Basic SEO (still have to decide whats included)
- Automatic invoicing thru szamlazz.hu or barion
- Subscriber collection with tags(where they came from). The subscribers should be exportable.

#### Premium Plan:
This plan offers some extra features and higher usage limits.
Price: 14990 HUF
- Everything in Basic Plan
- Email marketing feature with basic email editor and 1k marketing emails a month (with daily or weekly limits to keep the domain healthy), rest is pay as you go. These marketing emails could be automated.
- Abandoned cart email notification
- Review capture email notification after purchase
- B2B wholesale
- Advanced analytics 
- Unlimited delivery options
- Advanced SEO: Advanced metadata selection using AI generation for each product and webshop pages. User can change auto generated metadata tags or add new ones if they want. (Still have to decide when to generate)
- Advanced User management. Owners can add other accounts with different authorization. Owner can select the accesses with checkboxes. Still have to plan this one out.
- Multi currency support.
- Weight tiers in delivery
