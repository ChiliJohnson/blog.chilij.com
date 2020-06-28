module.exports = {
  title: "Chili J",
  url: process.env.SITE_URL,
  externalHomeUrl: process.env.EXTERNAL_HOME_URL,
  description: "Pretty much anything",
  strapline: "Pretty much anything",
  feed: {
    subtitle: "Pretty much anything",
    filename: "feed.xml",
    path: "/feed/feed.xml",
    id: process.env.BLOG_URL,
  },
  author: {
    name: "Chili Johnson",
    email: "ChiliJohnson@chilij.com",
  },
  defaultOgImage: "/images/og-lambda.png",
};
