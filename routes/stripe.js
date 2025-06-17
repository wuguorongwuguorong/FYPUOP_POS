const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY); 

router.post("/create-checkout-session", async (req, res) => {
  const { cart, customer_id, order_id } = req.body;

  try {
    const line_items = cart.map(item => ({
      price_data: {
    currency: "usd",
    product_data: {
      name: `${item.productName} (+9% tax included)`,
    },
    unit_amount: Math.round(item.price * 1.09 * 100)
  },
  quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items,
      success_url: `${process.env.CLIENT_URL}/success?order_id=${order_id}`,
      cancel_url: `${process.env.CLIENT_URL}/cart`,
      metadata: {
        customer_id: customer_id,
        order_id: order_id,
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe Error:", err);
    res.status(500).json({ error: "Stripe session creation failed" });
  }
});

module.exports = router;