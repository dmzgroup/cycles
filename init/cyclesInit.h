#ifndef CYCLES_INIT_DOT_H
#define CYCLES_INIT_DOT_H

#include <QtGui/QWidget>
#include <ui_cyclesInit.h>

namespace dmz {

class CyclesInit : public QWidget {

   Q_OBJECT

   public:
      CyclesInit ();
      ~CyclesInit ();

      Ui::cyclesSetupForm ui;
};

};

#endif // CYCLES_INIT_DOT_H
