import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';


interface Item {
  id: number;
  name: string;
  type?: string;
  qty: number;
  price: number;
  image?: string;
  enabled: boolean;
  time:string;
}
@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.css'
})
export class InventoryComponent {

  constructor(){

  }

   numbers: number[] = [1,2,3,4,5];
    currency = "₹";

    items:Item[]=[
      {id:1,name:"Pancakes",type:"Veg",qty:0,price:6.99,image: "https://via.placeholder.com/120",enabled:true,time:"10:00 12:00"},
      {id:2,name:"Chicken Chili",type:"Non-Veg",qty:0,price:22.99, enabled:true,time:"10:00 12:00"},
      {id:3,name:"Pizza",type:"Veg",qty:15,price:12.99, enabled:true,time:"10:00 12:00"},
      {id:4,name:"Paneer Chili",type:"Veg",qty:15,price:12.99, enabled:true,time:"10:00 12:00"}
     ];
     

}
