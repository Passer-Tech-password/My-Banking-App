interface Props {
  title: string;
  value: string;
  icon: string;
}

export default function ContactInfoCard({ title, value, icon }: Props) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 text-center border">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-gray-600">{value}</p>
    </div>
  );
}
