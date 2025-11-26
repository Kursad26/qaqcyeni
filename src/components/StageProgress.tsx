import { Check } from 'lucide-react';

interface Stage {
  number: number;
  title: string;
  status: 'completed' | 'current' | 'pending';
}

interface StageProgressProps {
  currentStage: number;
  completedStages: number[];
}

export function StageProgress({ currentStage, completedStages }: StageProgressProps) {
  const stages: Stage[] = [
    { number: 1, title: 'Form Oluşturma', status: 'pending' },
    { number: 2, title: 'Ön Onay', status: 'pending' },
    { number: 3, title: 'Veri Girişi', status: 'pending' },
    { number: 4, title: 'Kapama İşlemi', status: 'pending' },
    { number: 5, title: 'Kapama Onayı', status: 'pending' }
  ];

  const stagesWithStatus = stages.map(stage => {
    if (completedStages.includes(stage.number)) {
      return { ...stage, status: 'completed' as const };
    }
    if (stage.number === currentStage) {
      return { ...stage, status: 'current' as const };
    }
    return stage;
  });

  return (
    <div className="w-full bg-white border-b border-gray-200 py-6 px-4 md:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          {stagesWithStatus.map((stage, index) => (
            <div key={stage.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                    stage.status === 'completed'
                      ? 'bg-green-500 border-green-500'
                      : stage.status === 'current'
                      ? 'bg-blue-500 border-blue-500'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  {stage.status === 'completed' ? (
                    <Check className="w-5 h-5 text-white" />
                  ) : (
                    <span
                      className={`text-sm font-semibold ${
                        stage.status === 'current' ? 'text-white' : 'text-gray-500'
                      }`}
                    >
                      {stage.number}
                    </span>
                  )}
                </div>

                <div className="mt-2 text-center">
                  <p
                    className={`text-xs md:text-sm font-medium ${
                      stage.status === 'completed'
                        ? 'text-green-600'
                        : stage.status === 'current'
                        ? 'text-blue-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {stage.title}
                  </p>
                </div>
              </div>

              {index < stagesWithStatus.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 transition-all ${
                    completedStages.includes(stage.number) ||
                    (stage.status === 'completed' && completedStages.includes(stagesWithStatus[index + 1].number))
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  }`}
                  style={{ maxWidth: '80px' }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
