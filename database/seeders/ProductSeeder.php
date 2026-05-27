<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $products = [
            [
                'name'              => 'Starter',
                'slug'              => 'starter',
                'stripe_product_id' => null,
                'price_monthly'     => 36.00,
                'price_yearly'      => 21.60,
                'discount_badge'    => '40% OFF',
                'is_popular'        => false,
                'features'          => [
                    '10 carousels per month',
                    'All templates',
                    'Email support',
                ],
            ],
            [
                'name'              => 'Pro',
                'slug'              => 'pro',
                'stripe_product_id' => null,
                'price_monthly'     => 120.00,
                'price_yearly'      => 72.00,
                'discount_badge'    => '40% OFF',
                'is_popular'        => true,
                'features'          => [
                    '30 carousels per month',
                    'All templates',
                    'Priority support',
                    'Early access',
                ],
            ],
        ];

        foreach ($products as $data) {
            Product::updateOrCreate(['slug' => $data['slug']], $data);
        }
    }
}
