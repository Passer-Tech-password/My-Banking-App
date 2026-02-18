 "use client";
 
 import Link from "next/link";
 
 export default function CardsPage() {
   const cards = [
     {
       id: "primary",
       network: "VISA",
       maskedNumber: "**** **** **** 4589",
       holder: "JOHN DOE",
       expires: "12/26",
       status: "Active",
       statusColor: "text-green-600 bg-green-50",
       limitLabel: "Daily Limit",
       limitAmount: "$2,000.00",
     },
   ];
 
   return (
     <div className="space-y-6">
       <div className="flex items-center justify-between">
         <div>
           <h1 className="text-2xl font-bold text-gray-900">My Cards</h1>
           <p className="text-sm text-gray-500">
             View and manage your Aurora Bank debit and credit cards.
           </p>
         </div>
         <Link
           href="/dashboard"
           className="text-sm font-medium text-blue-600 hover:text-blue-700"
         >
           Back to dashboard
         </Link>
       </div>
 
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {cards.map((card) => (
           <div
             key={card.id}
             className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4"
           >
             <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-2xl" />
               <div className="flex justify-between items-start mb-8 relative z-10">
                 <span className="font-bold text-lg tracking-widest">
                   {card.network}
                 </span>
                 <div className="flex gap-1">
                   <div className="w-2 h-2 bg-red-500 rounded-full" />
                   <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                 </div>
               </div>
               <div className="mb-4 relative z-10">
                 <p className="text-xs text-slate-400 mb-1">Card Number</p>
                 <p className="font-mono text-lg tracking-wider">
                   {card.maskedNumber}
                 </p>
               </div>
               <div className="flex justify-between items-end relative z-10">
                 <div>
                   <p className="text-xs text-slate-400 mb-1">Card Holder</p>
                   <p className="font-medium text-sm">{card.holder}</p>
                 </div>
                 <div>
                   <p className="text-xs text-slate-400 mb-1">Expires</p>
                   <p className="font-medium text-sm">{card.expires}</p>
                 </div>
               </div>
             </div>
 
             <div className="space-y-3">
               <div className="flex items-center justify-between text-sm">
                 <span className="text-gray-600">Card Status</span>
                 <span
                   className={`font-medium px-2 py-1 rounded ${card.statusColor}`}
                 >
                   {card.status}
                 </span>
               </div>
               <div className="flex items-center justify-between text-sm">
                 <span className="text-gray-600">{card.limitLabel}</span>
                 <span className="font-medium">{card.limitAmount}</span>
               </div>
               <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                 <button className="text-xs font-medium text-blue-600 hover:text-blue-700">
                   Freeze card
                 </button>
                 <button className="text-xs font-medium text-blue-600 hover:text-blue-700">
                   Replace card
                 </button>
               </div>
             </div>
           </div>
         ))}
       </div>
     </div>
   );
 }
