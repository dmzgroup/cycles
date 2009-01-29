#ifndef CYCLES_INIT_DOT_H
#define CYCLES_INIT_DOT_H

#include <dmzAppShellExt.h>
#include <QtGui/QWidget>
#include <ui_cyclesInit.h>

namespace dmz {

class CyclesInit : public QWidget {

   Q_OBJECT

   public:
      CyclesInit (AppShellInitStruct &init);
      ~CyclesInit ();

      AppShellInitStruct &init;
      Ui::cyclesSetupForm ui;

   protected slots:
      void on_buttonBox_rejected ();
      void on_buttonBox_helpRequested ();
};

};

#endif // CYCLES_INIT_DOT_H
