import { useState, useEffect } from 'react';

interface Branch {
  id: string;
  name: string;
  address?: string;
}

interface BranchSelectionPageProps {
  onBranchSelected: (branchId: string, branchName: string) => void;
}

export default function BranchSelectionPage({ onBranchSelected }: BranchSelectionPageProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const branchList = await window.api.fetchBranches();
      setBranches(branchList);
      
      // Auto-select first branch if only one exists
      if (branchList.length === 1) {
        setSelectedBranchId(branchList[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load branches:', err);
      setError(err.message || 'Не удалось загрузить список филиалов');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBranchId) {
      setError('Выберите филиал');
      return;
    }

    const branch = branches.find(b => b.id === selectedBranchId);
    if (branch) {
      onBranchSelected(branch.id, branch.name);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--background)',
      }}>
        <div style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>
          Загрузка филиалов...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: 'var(--background)',
      padding: '20px',
    }}>
      <div className="card" style={{ maxWidth: '500px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '8px' }}>
            Выбор филиала
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Выберите филиал для работы
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
              Доступные филиалы
            </label>
            
            {branches.length === 0 ? (
              <div style={{
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--border)',
                textAlign: 'center',
                color: 'var(--text-secondary)',
              }}>
                Нет доступных филиалов
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {branches.map((branch) => (
                  <label
                    key={branch.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      padding: '16px',
                      borderRadius: '8px',
                      border: selectedBranchId === branch.id 
                        ? '2px solid var(--primary)' 
                        : '1px solid var(--border)',
                      backgroundColor: selectedBranchId === branch.id 
                        ? 'var(--primary-light, rgba(25, 118, 210, 0.08))' 
                        : 'var(--card-bg)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    data-testid={`branch-option-${branch.id}`}
                  >
                    <input
                      type="radio"
                      name="branch"
                      value={branch.id}
                      checked={selectedBranchId === branch.id}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      style={{ marginTop: '2px', marginRight: '12px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                        {branch.name}
                      </div>
                      {branch.address && (
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {branch.address}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: '#f8d7da',
                color: '#721c24',
              }}
              data-testid="text-error"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={!selectedBranchId || branches.length === 0}
            style={{ width: '100%' }}
            data-testid="button-select-branch"
          >
            Продолжить
          </button>
        </form>
      </div>
    </div>
  );
}
