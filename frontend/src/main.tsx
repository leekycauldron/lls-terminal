import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import './styles/cyberpunk.css'
import './styles/colors.css'

// Register stages (side-effect imports)
import './stages/stage0-context/ContextStage'
import './stages/stage1-script/ScriptStage'
import './stages/stage2-tts/TTSStage'
import './stages/stage3-scenes/ScenesStage'
import './stages/stage4-stitch/StitchStage'

import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
