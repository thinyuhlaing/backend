import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { ProductCategoriesModule } from './product-categories/product-categories.module';
import { ProductsModule } from './products/products.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductPricelistsModule } from './product-pricelists/product-pricelists.module';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';
// import { SimpleProductsModule } from './simple-products/simple-products.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    // Load values from `.env` once and make `ConfigService` available app-wide.
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    DatabaseModule,
    ProductsModule,
    ProductCategoriesModule,
    AuthModule,
    UsersModule,
    // SimpleProductsModule,
    OrdersModule,
    // ProductPricelistsModule,
    // PaymentMethodsModule,
    // DeliveryMethodsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
