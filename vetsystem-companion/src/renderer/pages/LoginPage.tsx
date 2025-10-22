import { useState, useEffect } from 'react';

interface Branch {
  id: string;
  name: string;
  address?: string;
}

interface LoginPageProps {
  onLoginSuccess: (branchId: string, branchName: string) => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [branchId, setBranchId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const branchList = await window.api.fetchBranches();
      setBranches(branchList);
      
      // Auto-select first branch if only one exists
      if (branchList.length === 1) {
        setBranchId(branchList[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load branches:', err);
      setError('Не удалось загрузить список филиалов');
    } finally {
      setBranchesLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      setError('Введите логин и пароль');
      return;
    }

    if (!branchId) {
      setError('Выберите филиал');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const user = await window.api.login(username, password);
      console.log('Login successful:', user);
      
      const selectedBranch = branches.find(b => b.id === branchId);
      onLoginSuccess(branchId, selectedBranch?.name || '');
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(err.message || 'Ошибка входа');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #eff6ff, #e0e7ff)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
    }}>
      <div className="card" style={{ maxWidth: '448px', width: '100%' }}>
        {/* Header with Logo */}
        <div style={{ padding: '24px 24px 16px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #1976D2 0%, #64B5F6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              color: 'white',
              fontWeight: 'bold',
            }}>
              🐾
            </div>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
            VetSystem Companion
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Войдите в свою учетную запись
          </p>
        </div>

        {/* Form */}
        <div style={{ padding: '0 24px 24px' }}>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Username */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                Имя пользователя
              </label>
              <input
                type="text"
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Введите логин"
                autoComplete="username"
                autoFocus
                data-testid="input-username"
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                Пароль
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Введите пароль"
                  autoComplete="current-password"
                  style={{ paddingRight: '40px' }}
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0',
                    top: '0',
                    height: '100%',
                    padding: '0 12px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                  }}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {/* Branch Selection */}
            <div>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                marginBottom: '8px', 
                fontSize: '14px', 
                fontWeight: '500' 
              }}>
                <span style={{ fontSize: '16px' }}>📍</span>
                Филиал
              </label>
              <select
                className="input"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                disabled={branchesLoading}
                data-testid="select-branch"
                style={{ cursor: branchesLoading ? 'wait' : 'pointer' }}
              >
                <option value="">
                  {branchesLoading ? 'Загрузка филиалов...' : 'Выберите филиал'}
                </option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}{branch.address ? ` - ${branch.address}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Error Message */}
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

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading || branchesLoading}
              style={{ width: '100%' }}
              data-testid="button-login"
            >
              {isLoading ? 'Вход...' : 'Войти'}
            </button>
          </form>

          {/* Footer */}
          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Обратитесь к администратору, если у вас нет доступа
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
