import { Global, Module } from '@nestjs/common';
import { ContentService } from '../content/content.service';
import { GamificationService } from '../gamification/gamification.service';
import { CurriculumService } from './curriculum.service';
import { LearningController } from './learning.controller';
import { LearningService } from './learning.service';
import { MasteryService } from './mastery.service';
import { RunService } from './run.service';

@Global()
@Module({
  controllers: [LearningController],
  providers: [
    ContentService,
    GamificationService,
    CurriculumService,
    MasteryService,
    RunService,
    LearningService,
  ],
  exports: [
    ContentService,
    GamificationService,
    CurriculumService,
    MasteryService,
    RunService,
    LearningService,
  ],
})
export class LearningModule {}
