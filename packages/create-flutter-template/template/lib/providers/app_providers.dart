import 'package:provider/provider.dart';
import 'package:provider/single_child_widget.dart';

import 'template_provider.dart';

final List<SingleChildWidget> appProviders = [
  ChangeNotifierProvider(create: (_) => TemplateProvider()),
];
