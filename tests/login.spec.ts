import { test, expect } from "playwright-test-coverage";

test("purchase with login", async ({ page }) => {
  await page.route("*/**/api/order/menu", async (route) => {
    const menuRes = [
      {
        id: 1,
        title: "Veggie",
        image: "pizza1.png",
        price: 0.0038,
        description: "A garden of delight",
      },
      {
        id: 2,
        title: "Pepperoni",
        image: "pizza2.png",
        price: 0.0042,
        description: "Spicy treat",
      },
      {
        id: 3,
        title: "Margarita",
        image: "pizza3.png",
        price: 0.0042,
        description: "Essential classic",
      },
      {
        id: 4,
        title: "Crusty",
        image: "pizza4.png",
        price: 0.0028,
        description: "A dry mouthed favorite",
      },
      {
        id: 5,
        title: "Charred Leopard",
        image: "pizza5.png",
        price: 0.0099,
        description: "For those with a darker side",
      },
    ];
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: menuRes });
  });

  await page.route("*/**/api/franchise", async (route) => {
    const franchiseRes = [
      {
        id: 1,
        name: "pizzaPocket",
        stores: [
          {
            id: 1,
            name: "SLC",
          },
        ],
      },
    ];
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: franchiseRes });
  });

  await page.route("*/**/api/auth", async (route) => {
    const loginReq = { email: "d@jwt.com", password: "diner" };
    const loginRes = {
      user: {
        id: 2,
        name: "pizza diner",
        email: "d@jwt.com",
        roles: [
          {
            role: "diner",
          },
        ],
      },
      token:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwibmFtZSI6InBpenphIGRpbmVyIiwiZW1haWwiOiJkQGp3dC5jb20iLCJyb2xlcyI6W3sicm9sZSI6ImRpbmVyIn1dLCJpYXQiOjE3NTkyNjg3MTh9.X8yKBwtobBIKc63I2bNFWK14gLy64Wfx8SL5NnYvyJ8",
    };
    expect(route.request().method()).toBe("PUT");
    expect(route.request().postDataJSON()).toMatchObject(loginReq);
    await route.fulfill({ json: loginRes });
  });

await page.goto('http://localhost:5173/');
await page.getByRole('button', { name: 'Order now' }).click();
await page.getByRole('combobox').selectOption('1');
await page.getByRole('link', { name: 'Image Description Veggie A' }).click();
await page.getByRole('link', { name: 'Image Description Veggie A' }).click();
await page.getByRole('button', { name: 'Checkout' }).click();

await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
await page.getByRole('textbox', { name: 'Email address' }).press('Tab');
await page.getByRole('textbox', { name: 'Password' }).fill('diner');
await page.getByRole('button', { name: 'Login' }).click();
await page.getByRole('button', { name: 'Pay now' }).click();
await expect(page.getByRole('main')).toContainText('0.008 ₿');
});
